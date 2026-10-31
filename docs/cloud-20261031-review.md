# 독립 코드 리뷰: 게시 전 리뷰 게이트 (2026-10-31)

- 대상: `Bum-Boo/IG-Account-Manager` @ `c84aaac` (Initial IG Manager core)
- 범위: 리뷰 없이 게시 가능한지, 상태 전이 생략/재실행, 로컬 파일 쓰기 경계, 자격증명·쿠키의 로그/추적 파일 기록
- 방식: 실제 코드 경로 추적 + 합성 데이터 재현 테스트(`review/review-gate.test.ts`). 외부 네트워크 호출, 실제 계정·토큰, UI 자동화 없음.
- 프로덕션 소스, 워크플로, 의존성, 매니페스트는 수정하지 않았다.

## 테스트 결과

| 명령 | 결과 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 성공 |
| `pnpm test` (turbo, `^build` 선행) | 19/19 태스크 성공, 10개 패키지 **53/53 테스트 통과** (domain 8, plugin-sdk 6, db 8, local-asset-source 4, workflow-engine 6, mock-publisher 5, instagram-publisher 5, scheduler-core 5, api 4, worker 2) |
| `pnpm --dir apps/api exec vitest run --config ../../review/vitest.config.mjs` | **9/9 통과**. 아래 결함들이 현재 코드에서 재현됨 |

재현 테스트는 "현재 동작"을 단언한다. 수정 후에는 R1~R6 단언이 실패해야 정상이며, 그때 기대 동작으로 바꾸면 회귀 테스트로 쓸 수 있다. 실행 전에 `pnpm test` 또는 `pnpm build`로 `packages/*/dist`를 만들어 둬야 한다.

## 요약

| ID | 분류 | 심각도 | 내용 |
| --- | --- | --- | --- |
| R1 | 검증된 결함 | P1 | `POST /candidates`가 `status`를 그대로 받아서 `approved`(또는 `scheduled`/`published`)로 바로 만들 수 있다. 승인 없이 게시까지 간다 |
| R2 | 검증된 결함 | P1 | `concept.metadata.workflowPolicy`(자유 형식, 감사 로그 없음)가 계정의 `requireApprovedCandidate`/`allowAutoPublishing`을 덮어써서 draft가 auto 게시된다 |
| R3 | 검증된 결함 | P2 | scheduled 후보를 다시 approve하면 기존 publish job이 취소되지 않는다. 재예약하면 이전 시각에 게시되고, 새 job은 영원히 queued로 남아 매번 실패한다 |
| R4 | 정적 위험(결함 주입으로 재현) | P2 | 외부 게시 성공 뒤 로컬 기록이 실패하면 `retryable: true`로 처리되어 같은 글이 다시 게시된다 |
| R5 | 검증된 결함(설정 의존) | P1 | `IG_MANAGER_LOCAL_TOKEN`을 설정하지 않으면 인증이 꺼지고, 기본 바인드가 `0.0.0.0`이라 같은 LAN의 누구나 승인/예약할 수 있다 |
| R6 | 검증된 결함 | P3 | 비밀값 제거(`sanitizeSecrets`)가 plugin metadata의 최상위 키만 처리한다. 중첩된 토큰은 API로 노출된다 |
| S1 | 정적 위험 | P2 | `WORKER_TRIGGER=manual`로 띄운 워커는 `autoPublish` 여부와 관계없이 기한이 된 job을 모두 무인 게시한다 |
| S2 | 정적 위험 | P2 | job/후보/감사 로그 쓰기가 트랜잭션이 아니고, job 상태 갱신에 CAS가 없다. 락은 프로세스 내부(InMemoryJobLock)뿐이다 |
| S3 | 정적 위험 | P3 | 퍼블리셔 오류 메시지가 그대로 로그, `lastError`, 감사 로그, 이벤트에 저장된다. 로거에는 마스킹이 없다 |
| S4 | 정적 위험 | P3 | 정책 관련 변경(concept 수정, plugin enable/disable, 계정 생성)이 감사 로그에 남지 않는다 |
| S5 | 정적 위험 | P3 | `.env.example`에 개인 Windows 경로(사용자명 포함)가 있다 |
| S6 | 정적 위험 | P3 | 웹 UI의 승인/반려 버튼 조건이 도메인 전이표와 맞지 않는다(서버가 거부하므로 안전한 쪽으로 실패) |
| C1~C6 | 이미 막혀 있음 / 문제 아님 | - | 아래 참고 |

참고: 현재 API·워커 레지스트리는 등록된 publisher마다 mock만 바인딩한다(`apps/api/src/publisher-registry.ts:27`, `apps/worker/src/publisher-registry.ts:32`). 따라서 지금 당장 실제 외부 게시로 이어지지는 않는다. 또 Instagram 플러그인은 `approvedAt`/`approvedBy`를 다시 확인한다(`plugins/official/instagram-publisher/src/index.ts:527`). 이 확인이 R1/R2를 플러그인 단에서 막아 주지만, Core 게이트가 아니라 개별 플러그인에 의존하는 방어선이다. 심각도는 Core가 보장하겠다고 문서화한 계약("review-first")을 기준으로 매겼다.

---

## R1. 생성 시 `status` 주입으로 리뷰 생략 (검증된 결함, P1)

- 위치: `apps/api/src/routes/candidates.ts:39` (`status: CandidateStatusSchema.optional()`), `packages/domain/src/factories.ts:159` (`status: input.status ?? "draft"`), `packages/workflow-engine/src/workflow-engine.ts:232`
- 트리거: `POST /candidates {"status":"approved", ...}` → `POST /candidates/:id/schedule` → 워커(manual)
- 관찰: 201 응답으로 `status=approved`, `approvedAt` 없음. 예약에 성공하고 워커가 `succeeded`로 게시한다. 감사 로그에는 `candidate.created`와 `candidate.scheduled`만 있고 `candidate.approved`는 없다. `status:"published"`로 생성하는 것도 허용된다.
- 기대: 생성 시점의 상태는 `draft` 또는 `ready_for_review`만 허용해야 한다. 승인은 `/approve`(감사 로그 남음)를 통해서만 가능해야 한다.
- 수정 방향: API 스키마에서 `status`를 `z.enum(["draft","ready_for_review"])`로 좁힌다. 더 근본적으로는 `WorkflowEngine.createPostCandidate`에서도 같은 제한을 강제한다. 그리고 `scheduleCandidate`/`runPublishJob`에서 `approvedAt && approvedBy` 존재를 Core가 직접 확인하게 한다(Instagram 플러그인이 하는 확인을 Core로 올리는 것). 덧붙여 draft를 ready_for_review로 옮기는 API 라우트가 없어서, 현재는 생성 시 `status`가 사실상 리뷰 대기열에 넣는 유일한 경로다. `POST /candidates/:id/submit` 같은 라우트를 추가하는 것이 좋다.
- 재현: `review/review-gate.test.ts` → "R1"

## R2. concept metadata가 계정 승인 정책을 덮어씀 (검증된 결함, P1)

- 위치: `packages/workflow-engine/src/policies.ts:12,22`, `packages/workflow-engine/src/workflow-engine.ts:232-244`, `apps/api/src/routes/concepts.ts:22,73`
- 트리거: 계정은 `allowAutoPublishing=false`, `allowAutoScheduling=false`, `requireApprovedCandidate=true`인 상태에서 `PUT /concepts/con {"metadata":{"workflowPolicy":{"autoSchedule":true,"autoPublish":true}}}`를 보낸 뒤, draft 후보를 `autoPublish:true`로 예약하고 auto 워커를 돌린다.
- 관찰: draft가 바로 `scheduled`가 되고 auto 워커가 게시에 성공한다. 이 과정에서 `requireApprovedCandidate`는 `false`로 강제 치환된다(`workflow-engine.ts:242-243`). `allowsAutoPublish`가 계정 OR concept 조건이라 concept 쪽만 켜도 통과한다. 계정의 `requireHumanApproval`/`allowAutoScheduling`은 어디에서도 읽지 않는다(grep 결과 스키마 정의에만 존재). concept 수정은 감사 로그에 남지 않는다.
- 기대: 계정 정책이 상한이 되어야 한다. 즉 `account.allowAutoScheduling && !requireApprovedCandidate && concept.autoSchedule`일 때만 미승인 예약을 허용하고, auto 게시는 `account.allowAutoPublishing && concept.autoPublish` AND 조건이어야 한다. 정책 변경은 별도로 검증된 필드와 감사 로그를 통해서만 가능해야 한다.
- 수정 방향: `policies.ts`의 OR 조건을 AND로 바꾸고 계정 플래그를 반영한다. `requireApprovedCandidate` 치환을 제거한다. workflowPolicy를 자유 형식 metadata에서 별도 스키마 필드로 옮기고 변경 시 감사 로그를 남긴다.
- 재현: "R2"

## R3. 재승인/재예약 시 이전 job이 남음 (검증된 결함, P2)

- 위치: `packages/domain/src/state-machines.ts:14` (`scheduled → approved` 허용), `packages/workflow-engine/src/workflow-engine.ts:166,265,353`, `packages/scheduler-core/src/scheduler-service.ts:196-214`
- 트리거: approve → schedule(t1, `job_old`) → 다시 approve(scheduled→approved) → schedule(t2, `job_new`) → 워커
- 관찰: 재승인 뒤에도 `job_old`는 `queued`로 남는다. 사용자가 t2로 미뤘는데도 t1 기준으로 `job_old`가 게시된다. 그 뒤 `job_new`는 후보가 `published`라서 `runPublishJob`이 예외를 던진다. 이 예외는 `startPublishJob` 전에 발생하므로 job이 `queued` 그대로 남고, 폴링할 때마다 다시 선택되어 실패한다(백오프·종결 없음).
- 기대: 후보가 `scheduled`를 벗어나면 그 후보의 활성 job(queued/retry_scheduled)은 `cancelPublishJob`으로 취소돼야 한다. 실행 불가능한 job은 `failed`나 `canceled`로 종결돼야 한다. 같은 후보에 활성 job은 하나만 있어야 한다.
- 수정 방향: approve/reject/archive 경로에서 해당 후보의 활성 job을 취소한다. `runPublishJob`이 job의 `scheduledAt`과 후보의 `scheduledAt`이 같은지 확인한다. 사전 조건이 실패하면 job을 `canceled`로 전이한다. 명시적인 "예약 취소" API를 만들고 `scheduled → approved` 전이는 그 경로에서만 쓰도록 한다.
- 재현: "R3"

## R4. 게시 성공 후 로컬 실패 시 중복 게시 (정적 위험, 결함 주입으로 재현, P2)

- 위치: `packages/scheduler-core/src/scheduler-service.ts:196-208`
- 트리거: `publisher.publish` 성공 직후 `markPublishSucceeded`가 한 번 예외를 던지게 한다(SQLite busy 등을 흉내 낸 합성 주입).
- 관찰: catch 블록이 `scheduler_execution_error`, `retryable: true`로 기록해서 job이 `retry_scheduled`가 된다. 다음 폴링에서 `publish`가 다시 호출되어 publish 호출 기록이 2회가 된다. `publisher.publish` 자체가 타임아웃으로 throw하는 경우(서버 쪽에서는 이미 게시됐을 수 있음)도 같은 경로를 탄다.
- 기대: 외부 부작용이 생긴 뒤의 실패는 재시도가 아니라 "확인 필요" 상태로 멈춰야 한다.
- 수정 방향: `publish` 호출 전후로 단계를 나눠서, publish가 성공한 뒤 발생한 예외는 `retryable: false`(또는 별도 상태)로 처리한다. `externalPostId`를 먼저 기록하거나 멱등 키(job id + attempt)를 플러그인에 전달한다.
- 재현: "R4"

## R5. 토큰 미설정 시 무인증 + 전체 인터페이스 바인드 (검증된 결함·설정 의존, P1)

- 위치: `apps/api/src/auth.ts:8` (`!context.apiToken`이면 통과), `apps/api/src/index.ts:11` (기본값 `0.0.0.0`), `.env.example:3`, README의 휴대폰 접속 안내
- 트리거: `IG_MANAGER_LOCAL_TOKEN` 없이 API를 실행하고 Authorization 헤더 없이 `POST /candidates/:id/approve`를 보낸다.
- 관찰: 200 응답과 함께 승인된다. `.env.example`에는 토큰 항목조차 없다.
- 기대: 토큰이 없으면 시작을 거부하거나 `127.0.0.1`에만 바인드해야 한다.
- 수정 방향: 비루프백 호스트에서는 토큰을 필수로 한다. `.env.example`에 `IG_MANAGER_LOCAL_TOKEN=`을 추가한다. 비교는 `crypto.timingSafeEqual`로 한다(현재는 `!==` 문자열 비교, `auth.ts:15`).
- 재현: "R5"

## R6. 비밀값 제거가 최상위 키에만 적용됨 (검증된 결함, P3)

- 위치: `packages/db/src/mappers.ts:321-325` (최상위 `Object.entries`만 필터), 적용 대상은 plugin metadata뿐(`mappers.ts:274,292`)
- 트리거: plugin metadata `{ settings: { accessToken: "SYNTHETIC-NESTED-SECRET" } }`를 넣고 `GET /plugins`를 호출한다.
- 관찰: 최상위 `token`은 제거되지만 중첩된 `settings.accessToken`은 DB에 저장되고 API 응답에도 나온다. account/platform/candidate metadata와 감사 로그의 `before`/`after`(`workflow-engine.ts:630`)에는 마스킹이 아예 없다.
- 기대: 저장과 응답 모두에서 재귀적으로 제거하고, 저장 전에 거부하는 편이 더 낫다.
- 수정 방향: `sanitizeSecrets`를 재귀로 바꾸고 account/candidate metadata와 감사 로그 직렬화에도 적용한다. 비밀값은 `settingsRef`로만 참조하도록 스키마에서 강제한다.
- 재현: "R6"

## S1. manual 트리거 워커가 모든 job을 무인 게시 (정적 위험, P2)

- 위치: `apps/worker/src/config.ts:67-68`, `packages/workflow-engine/src/workflow-engine.ts:357`, `packages/scheduler-core/src/scheduler-service.ts:81,89,139`
- 내용: `trigger === "manual"`이면 auto-publish 정책 검사를 건너뛴다. 그런데 API에는 job을 하나씩 수동 실행하는 라우트가 없다. 그래서 `autoPublish=false` job을 게시하는 유일한 방법이 `WORKER_TRIGGER=manual` 워커이고, 이 워커는 폴링 루프에서 기한이 된 job을 모두 사람 개입 없이 게시한다. R3 재현 테스트도 이 경로를 사용한다.
- 수정 방향: manual은 job id를 지정한 1회 실행(예: `POST /publish-jobs/:id/run`, 감사 로그 포함)으로 한정한다. 폴링 워커는 항상 auto 정책을 적용한다.

## S2. 비트랜잭션 쓰기·프로세스 간 락 부재 (정적 위험, P2)

- 위치: `workflow-engine.ts:264-265, 410-411` (job/후보 순차 update), `packages/db/src/repositories/publish-job.repository.ts:44-47` (조건 없는 `UPDATE ... WHERE id`), `packages/scheduler-core/src/job-lock.ts:15`
- 내용: 워커 두 개(또는 워커와 향후 API 실행 라우트)가 같은 `queued` job을 읽으면 둘 다 `running`으로 덮어쓰고 둘 다 게시한다. job은 갱신됐는데 후보 갱신이 실패하면 상태가 어긋난다.
- 수정 방향: 상태 전이를 `UPDATE ... WHERE id=? AND status=?` 형태의 CAS로 바꾸고 변경 행 수를 확인한다. 관련 쓰기는 `better-sqlite3` 트랜잭션으로 묶는다.

## S3. 오류 메시지가 그대로 저장·로그됨 (정적 위험, P3)

- 위치: `plugins/official/instagram-publisher/src/index.ts:458-467`, `scheduler-service.ts:197-206`, `packages/logger/src/index.ts:17` (마스킹 없음)
- 내용: 실제 Graph API 클라이언트를 구현하면 fetch 오류 메시지에 `access_token`이 붙은 URL이 들어가기 쉽다. 그 문자열이 콘솔, `publish_jobs.last_error`, 감사 로그, `workflow_events`에 그대로 남는다. 현재 클라이언트는 미구현(TODO)이라 실제로 노출되지는 않는다.
- 수정 방향: 로거와 `failPublishJob` 입력에 토큰 패턴(`access_token=`, `Bearer ` 등)을 마스킹하는 함수를 적용한다.

## S4. 정책 변경 미감사 (정적 위험, P3)

- 위치: `apps/api/src/routes/concepts.ts:73`, `apps/api/src/routes/plugins.ts:42,48`, `apps/api/src/routes/accounts.ts`(생성)
- 내용: 게시 게이트를 바꾸는 concept 정책 변경(R2)과 publisher plugin 활성화가 감사 로그 없이 이뤄진다. SECURITY.md가 "workflow audit logging"을 보안 범위로 명시하고 있다.
- 수정 방향: 해당 라우트에서 `auditLogs.append`를 호출한다.

## S5. `.env.example`의 개인 경로 (정적 위험, P3)

- 위치: `.env.example:6` (`COMFYUI_PATH=C:\Users\<사용자명>\...`)
- 내용: 비밀값은 아니지만 로컬 사용자명이 공개 저장소에 들어 있다.
- 수정 방향: `COMFYUI_PATH=` 같은 플레이스홀더로 바꾼다.

## S6. UI 버튼 조건과 전이표 불일치 (정적 위험, P3)

- 위치: `apps/web/src/pages/CandidatesPage.tsx:193-194` 와 `packages/domain/src/state-machines.ts:10-12`
- 내용: UI는 `changes_requested`에서 승인을, `approved`에서 반려를 허용하지만 도메인은 두 전이를 모두 거부한다. 서버가 막으므로 보안 문제는 아니고 사용성 문제다.
- 수정 방향: UI가 `CANDIDATE_STATUS_TRANSITIONS`를 공유해서 쓰게 한다.

---

## 이미 막혀 있음 / 문제 아님

- C1 (이미 막혀 있음): 기본 계정 정책에서 draft는 approve할 수 없고 예약도 거부된다(`state-machines.ts:10,103`). 재현 테스트의 "기준선"으로 확인했다.
- C2 (이미 막혀 있음): `autoPublish=false` job은 auto 워커가 건너뛴다(`workflow-engine.ts:302,517-531`). 기준선 테스트로 확인했다.
- C3 (이미 막혀 있음): publish job의 종결 상태(`succeeded/failed/canceled`)에서는 전이가 없고, `startPublishJob`이 시도 횟수 상한을 지킨다(`state-machines.ts:195-245`). `approved → approved` 재승인은 거부된다. 기존 domain/workflow 테스트가 다룬다.
- C4 (문제 아님): 로컬 파일 쓰기는 DB 파일의 상위 디렉터리를 만드는 `mkdirSync`뿐이다(`apps/api/src/server.ts:121`, `apps/worker/src/runtime.ts:108`, `packages/db/src/seed.ts:28`, `packages/db/src/migrate.ts:9`). 경로는 운영자 환경변수에서만 오고 요청 입력으로 바꿀 수 없다. `local-asset-source`는 읽기 전용이고, `sourceUri` 루트 제한이 없지만(`index.ts:252`) API에 연결되어 있지 않다. 또 `Dirent.isFile()`이라 심볼릭 링크는 따라가지 않는다. 연결할 때 허용 루트 검사를 추가하길 권한다.
- C5 (문제 아님): Fastify 기본 요청 로그 직렬화는 헤더를 기록하지 않으므로 Authorization이 로그에 남지 않는다. 워커 로그(`runtime.ts:70`)는 DB 경로와 설정값만 출력한다.
- C6 (이미 막혀 있음): 추적 파일에서 토큰·쿠키 패턴을 검색했지만 문서 속 경고 문구 외에는 나오지 않았다. `.gitignore`가 `.env*`, vault, `*.token.json` 등을 제외하고 있다. 추적 중인 `apps/web/dashboard-candidates.png`는 mock 데이터 화면이다.

## 사용한 명령

```bash
pnpm install --frozen-lockfile
pnpm test                                   # 53/53 통과, dist 생성
pnpm --dir apps/api exec vitest run --config ../../review/vitest.config.mjs   # 9/9 통과(결함 재현)
git grep -nIiE "(access_token|EAA[A-Za-z0-9]{10,}|sessionid|csrftoken|cookie|Bearer [A-Za-z0-9]{12,}|ghp_|sk-[A-Za-z0-9]{10})" -- ':!pnpm-lock.yaml'
grep -rn "writeFile\|mkdirSync\|createWriteStream\|appendFile\|rename\|unlink\|rmSync\|copyFile" --include=*.ts apps packages plugins
grep -rn "requireHumanApproval\|allowAutoScheduling\|requireApprovedCandidate" --include=*.ts packages apps plugins
```

## 우선순위 제안

1. R1, R2: 생성 상태를 제한하고, 정책을 AND 조건으로 바꾸고, Core에서 `approvedAt` 존재를 확인한다. 변경이 작고 게이트 계약을 직접 회복한다.
2. R5: 토큰 필수화 또는 루프백 기본 바인드.
3. R3, S1, S2, R4: job 생명주기(취소, 단일 활성 job, CAS, 게시 후 실패 처리)를 함께 정리한다.
4. R6, S3~S6: 마스킹, 감사 로그, 문서 정리.
