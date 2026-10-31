// review/ 전용 설정. 저장소의 turbo 테스트 파이프라인에는 포함되지 않는다.
export default {
  test: {
    root: new URL(".", import.meta.url).pathname,
    include: ["*.test.ts"]
  }
};
