# 클라우드 세션 보고서 (2026-10-31): 개발자 없이 쓸 수 있는 리뷰 우선 파이프라인

- 기준 브랜치: `fix/scheduler-completion-boundaries-20261012` (PR #2, `73a6744`)
- 작업 브랜치: `claude/review-first-pipeline-usable-wd18ss`
- 범위: 준비 → 검토(승인/반려) → 예약 → mock 워커 실행 → 결과·감사 로그 확인 루프, seed/sample 분리, 390px 레이아웃
- PR #1(`codex/project-progress-snapshot`)과 그 파생물은 건드리지 않았습니다. Instagram·Meta API를 포함한 외부 서비스 호출은 없습니다. 모든 데이터는 합성(synthetic) 데이터입니다.

## 1. 결과 요약

| 구분 | 이전 | 이후 |
| --- | --- | --- |
| 빈 워크스페이스 | "로컬 API로 계정을 만들거나 seed 하세요" 안내만 표시 | **Load starter seed** 버튼, **Prepare a candidate** 입력 폼 |
| API 실패 | 아무 표시 없이 sample 보드로 교체됨 (화면에는 "Mock data") | 마지막으로 불러온 워크스페이스를 유지하고 오류와 Retry 표시. sample은 사용자가 명시적으로 열 때만 표시 |
| 워커 | API와 워커가 서로 다른 SQLite 파일을 사용. 리뷰 우선 작업은 실행할 방법이 없음 | 같은 DB 파일 사용. **Run now** → 워커(mock publisher)가 정확히 1회 실행 |
| Retry | 작업이 `running`에 영구히 멈춤 | 워커가 처리하도록 다시 due 상태로 만듦 |
| 390px | 페이지 폭 857px. 상세 패널 컨트롤이 화면 밖으로 잘림 | 폭 390px. 모든 주요 컨트롤이 화면 안에 있음 (헤드리스 브라우저로 검증) |
| 동시성 | API·워커가 작업 행을 통째로 덮어씀 → 오래된 쓰기로 이중 게시 가능 | 상태 전이에 compare-and-set 적용 |
| 테스트 | 63개 | 단위/통합 91개 + 브라우저 e2e 3개 |

## 2. 발견 사항과 변경 내용

분류: **확인된 결함**(재현 후 수정), **정적 위험**(코드 분석으로 찾았고 재현하지 않음), **이미 다뤄짐**, **문제 아님**.

### 확인된 결함 (재현 → 수정 → 회귀 테스트)

1. **API와 워커가 서로 다른 DB 파일을 사용함.** 기본값 `./data/ig-manager.sqlite`가 프로세스의 cwd 기준이고, `pnpm --filter`는 각 패키지 디렉터리에서 실행됩니다. 그래서 `apps/api/data/…`와 `apps/worker/data/…`가 따로 생겼습니다(실제 실행으로 두 파일 생성을 확인). 대시보드에서 예약한 작업을 워커가 볼 수 없었습니다.
   - 수정: `packages/db/src/paths.ts:17` `defaultDatabaseFilename()`이 `<workspace>/data/ig-manager.sqlite`를 반환합니다. API(`apps/api/src/index.ts`), 워커(`apps/worker/src/config.ts:19`), seed/migrate 스크립트가 이 값을 함께 씁니다.
   - 테스트: `packages/db/src/paths.test.ts`, `apps/worker/src/index.test.ts` ("defaults to the same workspace database file as the API").
2. **리뷰 우선 작업을 사람이 실행할 경로가 없음.** 워커 기본값 `trigger=auto`는 auto-publish로 예약된 작업만 실행합니다(`workflow-engine.ts` `filterAutoPublishJobs`). UI로 예약한 작업은 그대로 대기했습니다.
   - 수정: `WorkflowEngine.requestPublishJobRun` (`packages/workflow-engine/src/workflow-engine.ts:504`). 사람의 실행 요청을 `metadata.runRequest`와 감사 로그 `publish_job.run_requested`로 남기고 작업을 즉시 due로 만듭니다. 이 단계에서는 아무것도 게시하지 않습니다. 워커가 다음 폴링 때 `manual` trigger로 실행하고(`:357`), 실행을 시작하면 요청을 소모합니다(`:379`). 요청 1번이 시도 1번입니다. auto-publish opt-in 정책은 바뀌지 않았습니다.
   - API: `POST /publish-jobs/:id/run` (`apps/api/src/routes/publish-jobs.ts:42`).
   - 테스트: workflow-engine 4개, `apps/worker/src/review-loop.test.ts`(실제 워커 + 공유 SQLite 파일: 요청 전에는 게시하지 않음, 요청 후 정확히 1회 게시, 다시 폴링해도 재게시하지 않음).
3. **Retry가 작업을 `running`에 영구히 멈추게 함.** `POST /publish-jobs/:id/retry`가 `retryPublishJob` → `startPublishJob`으로 `running`을 만들었지만, 그 시도를 끝낼 프로세스가 없습니다. 워커는 `queued`/`retry_scheduled`만 조회합니다. 기존 테스트도 `running`을 단언하고 있었습니다.
   - 수정: retry 라우트도 `requestPublishJobRun`을 사용합니다. 엔진의 `retryPublishJob` 계약(인프로세스 실행기용)은 그대로 두었습니다.
   - 테스트: `apps/api/src/server.test.ts` ("hands run and retry requests to the worker…").
4. **API 실패 시 sample 데이터로 조용히 교체됨.** `loadWorkspaceSnapshot`이 실패하면 `mockWorkspaceData`를 반환했고, 이미 불러온 실제 데이터도 덮어썼습니다. sample 모드에서는 승인 같은 동작이 로컬에서만 성공한 것처럼 보였습니다. API를 끈 상태에서 "Mock data" 보드가 표시되는 것을 브라우저로 재현했습니다.
   - 수정: `apps/web/src/api/client.ts:170` `loadWorkspaceData`는 실패 시 예외를 던집니다. `apps/web/src/hooks/workspaceState.ts:23` `applyWorkspaceLoad`는 실패해도 기존 데이터와 출처를 유지하고 오류만 기록합니다. 첫 로드가 실패하면 연결 오류 화면을 보여 줍니다. **Open sample preview**를 눌러야만 sample을 열고, 화면 상단에 "Sample preview: example data, not saved" 배너가 붙습니다(`components/WorkspaceStatus.tsx`).
   - 테스트: `workspaceState.test.ts`, `client.test.ts`, e2e "API failure keeps the user's workspace…".
5. **390px에서 문서(상세) 패널이 잘림.** 모바일 규칙 `.app-frame { grid-template-columns: 1fr }`의 `1fr` 트랙은 줄바꿈되지 않는 내비게이션의 min-content 폭만큼 늘어납니다. 그래서 페이지 폭이 857px이 되었고, 상세 패널 버튼이 x=31–826 범위에 놓여 화면 밖으로 나갔습니다(스크린샷과 DOM 측정으로 확인).
   - 수정: `apps/web/src/styles.css:891` `minmax(0, 1fr)`. 내비게이션은 줄바꿈하고(`:913`), 테이블 행은 모바일에서 카드형으로 쌓아 **Run now**가 화면 안에 남게 했습니다.
   - 테스트: e2e "390px mobile…". 페이지 폭 ≤ 390px, Approve/Reject/Regenerate/Schedule/Publish time/Run now/내비 링크가 모두 0–390px 안에 있는지 확인하고 실제로 탭합니다. 스크린샷은 `apps/web/e2e/output/`에 저장됩니다.
6. **플러그인 Enable/Disable이 HTTP 500으로 실패함.** 클라이언트가 body 없는 POST에도 `content-type: application/json`을 보냈고, Fastify가 이를 400으로 거부했습니다. 그런데 API 오류 핸들러가 알 수 없는 오류를 모두 500으로 바꿨습니다(`inject`로 재현).
   - 수정: 클라이언트는 body가 있을 때만 content-type을 보냅니다(`client.ts:130`). 오류 핸들러는 Fastify의 4xx를 그대로 돌려줍니다(`apps/api/src/errors.ts:67`).
   - 테스트: API 테스트 1개, 클라이언트 테스트 1개.
7. **Prepare 폼의 concept 목록이 비어 있음** (이번 작업 중 e2e가 발견). seed 전에 마운트되면 초기 account id `""`로 concept을 필터링했습니다.
   - 수정: 렌더링할 때마다 현재 데이터로 선택값을 결정합니다(`apps/web/src/pages/CandidatesPage.tsx:456`).
   - 테스트: e2e.

8. **동시 쓰기 경쟁으로 같은 작업이 두 번 게시될 수 있음** (독립 리뷰 서브에이전트가 지적했고, 재현 테스트로 확인). API와 워커는 같은 SQLite 파일을 쓰는 별도 프로세스이고, `pnpm dev`의 워커와 `pnpm worker:once`가 동시에 돌 수도 있습니다. 작업 시작과 실행 요청 기록이 앞서 읽은 값으로 행 전체를 덮어썼기 때문에, 이미 `running`인 작업이 다시 `queued`로 돌아가거나 두 워커가 같은 작업을 시작할 수 있었습니다.
   - 수정: `PublishJobRepository.updateIfUnchanged` (`packages/db/src/repositories/publish-job.repository.ts:49`)는 status·attempt·updatedAt이 그대로일 때만 씁니다. 엔진은 `writeJobTransition` (`workflow-engine.ts:595`)으로 이를 사용하고, 행이 바뀌었으면 거부합니다.
   - 테스트: 엔진 2개(수정 전 실패 확인), DB 1개.
9. **웹: 응답 순서가 뒤바뀌면 오래된 상태가 표시됨** (리뷰가 지적). 느린 첫 로드가 승인 뒤의 재로드보다 늦게 도착하면 화면이 되돌아갔습니다. API 주소를 바꾼 뒤에도 이전 서버의 데이터가 "API connected"로 남았습니다.
   - 수정: 로드 순번(`workspaceState.ts:40`, `useWorkspaceData.ts:50`)으로 최신 로드만 반영합니다. 설정을 바꾸면 이전 데이터를 비웁니다(`useWorkspaceData.ts:94`). API 실패는 데이터를 유지하지만, 설정 변경은 사용자의 의도적인 조작이라 다르게 처리합니다.
   - 테스트: sequencer 단위 테스트. hook 전체는 테스트 도구가 없어 e2e로만 확인했습니다.

### 정적 위험 (수정함)

- **Run now 시 예전 오프셋 `scheduledAt`이 정규화되지 않음** (리뷰가 지적). 이번 변경 전에 오프셋 형식으로 저장된 작업은 실행을 요청해도 due 조회에 걸리지 않을 수 있었습니다. 요청할 때 정규화합니다. 테스트 추가.

- **오프셋이 붙은 `scheduledAt`이 due 판정을 틀리게 할 수 있음.** API는 `+09:00` 같은 오프셋을 허용하지만, due 조회는 SQLite에서 문자열로 비교합니다. 대시보드는 항상 `Z` 형식을 보내므로 UI 경로에는 영향이 없었습니다. 엔진에서 UTC로 정규화했습니다(`workflow-engine.ts:254`). 테스트 추가.
- **오류가 사라지는 UI 동작.** Plugins 토글은 `void onToggle(...)`로 실패를 버렸습니다. Concept 저장은 예외가 나면 "Saving" 상태에 고정되었습니다. 이제 둘 다 오류를 표시합니다(`PluginsPage.tsx:53`, `ConceptEditorPage.tsx:75`). 컴포넌트 테스트 도구가 없어 단위 테스트는 없고, 빌드와 수동 확인만 했습니다.

### 정적 위험 (수정하지 않음, 후속 권장)

- `scheduler-service.ts`: `runPublishJob`이 시작 전에 예외를 던지면(예: 후보가 더 이상 `scheduled`가 아님) 작업이 `queued`로 남고, 매 폴링마다 다시 선택되어 오류를 남깁니다. auto 작업과 실행 요청된 작업에 해당합니다. 정책 결정이 필요해 이번 범위에서는 바꾸지 않았습니다.
- 환경변수로 상대 경로 DB(`API_DATABASE_URL=./x.sqlite`)를 주면 여전히 각 프로세스의 cwd 기준으로 해석됩니다. 문서에는 절대 경로를 권장하도록 적었습니다(`docs/api/local-api.md`).
- 데스크톱 보드(6열)는 자체 가로 스크롤을 씁니다. 기존 동작이며 이번 범위 밖입니다.
- 모바일에서 Jobs 표의 행을 카드로 쌓으면서 열 제목을 숨겼습니다. 그래서 "1/3" 같은 값에 라벨이 없습니다. 기능에는 영향이 없습니다.
- starter seed는 고정 ID를 씁니다. 계정을 지운 뒤 다시 seed하면 ID가 충돌할 수 있습니다. 현재 API에는 계정 삭제 경로가 없어 이 상황에 도달할 수 없습니다.

### 이미 다뤄짐

- 게시 성공 후 기록이 실패할 때 재게시를 막는 동작, 선택적 댓글 실패 처리: PR #2에서 이미 다뤘습니다.
- 플러그인 메타데이터의 토큰류 필드 제거: DB mapper에서 이미 처리하고 테스트도 있습니다.

### 문제 아님

- 문서가 publisher를 mock/dry-run 스켈레톤으로 설명하는 것은 사실과 같습니다. `plugins/official/instagram-publisher`는 API에도 워커에도 연결되어 있지 않습니다(import 없음 확인). API와 워커의 publisher registry는 모든 registration을 mock publisher에 연결합니다. README에 이 점을 명시했습니다.

### seed와 sample의 구분 (요청 사항 2)

- **seed**: `packages/db/src/seed-data.ts`. 빈 워크스페이스에만 기록되는 합성 starter 데이터입니다. 모든 레코드에 `metadata.seed = "starter-v1"`(`:33`)이 붙고, 트랜잭션으로 기록되며, 데이터가 있으면 409를 반환합니다(`:223`). `POST /workspace/seed`, `pnpm seed`, 대시보드 버튼으로 실행합니다. 실제 URL이나 자격 증명 형태의 문자열이 없다는 것도 테스트합니다.
- **sample**: `apps/web/src/api/sampleData.ts`(기존 `mockData.ts`에서 이름 변경). 브라우저 안에서만 존재하고 저장되지 않습니다. 사용자가 명시적으로 열 때만 표시됩니다. 실제 그래프 API URL은 제거했습니다.
- `packages/db/src/demo-data.ts`는 repository 테스트용 fixture이며 런타임에는 쓰지 않습니다.

## 3. 실행한 명령과 결과 (이 VM, Node 22.23.4, pnpm 11.1.1)

| 명령 | 이전 (`73a6744`) | 이후 |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 성공 | 성공 (lockfile 변경 없음) |
| `pnpm typecheck` | 19/19 tasks 성공 | 19/19 성공 |
| `pnpm lint` | 13/13 성공 | 13/13 성공 |
| `pnpm test` | 19/19 tasks, **63 tests** 통과 (web은 테스트 0개) | 19/19, **91 tests** 통과 |
| `pnpm build` | 13/13 성공 | 13/13 성공 |
| `pnpm build && pnpm test:e2e` | (없음) | **3/3** 통과 (헤드리스 Chromium) |

이후 패키지별 테스트 수: db 17(+7), workflow-engine 13(+7), api 8(+4), worker 4(+2), web 8(+8), 나머지(domain 8, plugin-sdk 6, scheduler-core 11, plugin 3종 16)는 같습니다. 이후 측정은 `--force`로 turbo 캐시를 쓰지 않고 실행했습니다.

재현에 사용한 수동 확인:
- API와 워커를 각자 실행하면 SQLite 파일이 두 개 생기는 것을 확인했습니다.
- 390px에서 `scrollWidth`가 857이었습니다.
- API를 끄면 "Mock data" 보드가 표시되었습니다.
- 빈 body POST에 HTTP 500이 반환되었습니다.

독립 리뷰(서브에이전트)는 수정 내용을 미리 알려 주지 않고 diff만 주어 진행했습니다. 지적된 3건은 위 8·9번 항목과 오프셋 항목으로 반영했습니다. 동시성 테스트 2개는 수정 전에 실패하는 것을 확인한 뒤 수정했습니다. 그 밖의 새 회귀 테스트를 수정 전 코드에서 하나씩 돌려 보지는 않았습니다. 대부분 새 API에 의존하기 때문입니다. 대신 위의 재현으로 수정 전 실패를 확인했습니다.

## 4. 이 VM에서 검증하지 못한 것

- Windows/macOS 실행. 소유자는 Windows를 쓰는 것으로 보입니다(`.env.example`). `pnpm worker:once`는 환경변수 없이 `--once` 플래그로 동작하게 만들었지만, Windows 셸에서 직접 확인하지는 못했습니다. 경로 처리(`fileURLToPath`, `resolve`)도 Windows 드라이브 경로로는 실행해 보지 않았습니다.
- 실제 휴대폰과 Safari/iOS. 390px 검증은 Linux의 헤드리스 Chromium 모바일 에뮬레이션에서만 했습니다.
- PWA 설치와 오프라인 동작.
- 실제 Instagram·Meta API, OAuth, 토큰 저장. 범위상 금지되어 호출하지 않았습니다.
- API와 워커가 오래 동시에 실행될 때 SQLite 잠금 경합. 테스트는 짧은 동시 접근만 다룹니다.
- `pnpm dev`(turbo watch) 상태에서 워커의 30초 폴링을 장시간 관찰하지 않았습니다. 실행 경로 자체는 `--once`와 같은 `pollOnce`입니다.

## 5. 소유자를 위한 다음 단계

1. Windows에서 `pnpm install && pnpm build && pnpm dev`를 실행한 뒤 대시보드에서 1절의 루프를 한 번 직접 돌려 보세요: Load starter seed → Prepare → Approve/Reject → Schedule → Run now → `pnpm worker:once` → Refresh → Jobs/Audit log.
2. 휴대폰(같은 네트워크)에서 `http://<PC-IP>:5173/#/candidates`를 열고 상세 패널과 Jobs 화면의 버튼을 확인해 주세요.
3. CI에서 `pnpm test:e2e`를 쓰려면 CI 이미지에 Playwright Chromium을 설치하는 단계가 필요합니다. 의존성 추가는 소유자 결정이라 이번에는 하지 않았고, 설치되어 있지 않으면 테스트는 skip됩니다.
4. 정책 결정: 시작 전에 실패하는 작업을 `failed`로 전환할지, 아니면 실행 요청을 지울지 정해 주세요(위 정적 위험 첫 항목).
5. 실제 publisher를 연결할 때는 API와 워커 registry가 지금 무조건 mock에 연결된다는 점(`apps/api/src/publisher-registry.ts`, `apps/worker/src/publisher-registry.ts`)을 바꾸게 됩니다. 이때 `runRequest` 흐름과 감사 로그가 그대로 유지되는지 테스트로 고정하는 것을 권장합니다.
6. "Regenerate"는 API가 아직 지원하지 않습니다. 이제 버튼을 누르면 명시적인 오류를 표시합니다.
