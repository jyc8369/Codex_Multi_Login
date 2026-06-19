[English](#english) | [한국어](#korean)

<a name="english"></a>
# Codex Multi Login - Developer Guide

This document explains the structure and behavior of the `Codex Multi Login` extension for developers.

## Project goals

- Manage multiple Codex accounts in one place.
- Switch the active `auth.json` safely.
- Check saved tokens and quota status in the dashboard.
- Provide the available feature set in VS Code Web as well.

## Current scope

- Add account
- JSON import/export
- Switch account
- Refresh quota
- Render the dashboard
- Split behavior between web host and desktop host

## Core files

- `src/extension.ts`: extension entry point, command registration, and state switching
- `src/dashboard.ts`: dashboard UI rendering and message handling
- `src/storage/accounts.ts`: account storage, lookup, and cleanup
- `src/storage/config.ts`: settings storage
- `src/auth/oauth.ts`: OAuth session handling
- `src/localization.ts`: locale and theme normalization
- `package.json`: commands, settings, and build scripts
- `extension/`: packaged extension metadata
- `out/`: compiled output

## Architecture

### Storage layer

- Account metadata and tokens are stored separately.
- Sensitive tokens use the OS keychain by default.
- Plaintext storage must be selected explicitly.

### Runtime layer

- On activation, the extension reads settings and checks the storage mode.
- It can verify keychain availability and show a warning.
- The dashboard rerenders from the currently stored accounts.

### Message flow

- The dashboard requests account add, switch, delete, reorder, and theme/locale changes through webview messages.
- The extension receives those requests, updates storage, and shows the updated state again.

## Main behavior

### Add account

1. Prepare an OAuth session.
2. Receive the login result with `runPreparedOAuthLoginSession()`.
3. Store the token and metadata.
4. Open the dashboard again.

### JSON import/export

- Import: read account tokens from a JSON file and store them.
- Export: write the currently stored accounts to a JSON file.

### Refresh quota

- Works for a single account or all accounts.
- The refresh result is reflected back into the dashboard card HTML.

## Settings

Main settings exposed in `package.json`:

- `codexMultiLogin.dashboardTheme`
- `codexMultiLogin.dashboardLocale`
- `codexMultiLogin.storageMode`

## Implementation notes

- Hide local file and keychain dependent features in web host mode.
- Storage mode changes should update user warnings and saved settings together.
- The dashboard message handler depends heavily on command strings.
- Keep command names aligned with the actual registered commands.

## Important facts

- The project is a TypeScript-based VS Code extension.
- It uses the `out/` artifacts for distribution.
- It has a `browser` entry point for web compatibility.
- Extension state uses both `globalState` and global storage.

## Future work

- Make the account store and dashboard message structure easier to maintain.
- Keep the feature differences between web host mode and desktop mode documented in code and docs together.
- Update related docs when the JSON format or storage rules change.

<a name="korean"></a>
# Codex Multi Login - 개발자 가이드

이 문서는 `Codex Multi Login` 확장의 구조와 동작을 개발자 기준으로 설명합니다.

## 프로젝트 목표

- 여러 Codex 계정을 한 곳에서 관리한다.
- 활성 `auth.json`을 안전하게 전환한다.
- 저장된 토큰과 quota 상태를 대시보드에서 확인한다.
- VS Code Web 환경에서도 가능한 범위의 기능을 제공한다.

## 현재 범위

- 계정 추가
- JSON import/export
- 계정 전환
- quota 새로고침
- 대시보드 렌더링
- 웹 호스트/데스크톱 호스트 분기

## 핵심 파일

- `src/extension.ts`: 확장 진입점, 명령 등록, 상태 전환
- `src/dashboard.ts`: 대시보드 UI 렌더링과 메시지 처리
- `src/storage/accounts.ts`: 계정 저장/조회/정리
- `src/storage/config.ts`: 설정 저장
- `src/auth/oauth.ts`: OAuth 세션 처리
- `src/localization.ts`: 로케일 및 테마 정규화
- `package.json`: 명령, 설정, 빌드 스크립트
- `extension/`: 배포용 확장 패키지 메타데이터
- `out/`: 컴파일 결과물

## 아키텍처

### 저장 계층

- 계정 메타데이터와 토큰은 분리해서 저장한다.
- 민감한 토큰은 기본적으로 OS keychain을 사용한다.
- 평문 저장 모드는 명시적으로 선택해야 한다.

### 실행 계층

- 확장 활성화 시 설정을 읽고 저장 모드를 확인한다.
- 키체인 사용 가능 여부를 점검한 뒤 경고를 보여줄 수 있다.
- 대시보드는 현재 저장된 계정을 기준으로 다시 렌더링된다.

### 메시지 흐름

- 대시보드는 웹뷰 메시지를 통해 계정 추가, 전환, 삭제, 순서 이동, 테마/언어 변경을 요청한다.
- 확장은 해당 요청을 받아 저장소를 갱신하고 다시 상태를 표시한다.

## 주요 동작

### 계정 추가

1. OAuth 세션을 준비한다.
2. `runPreparedOAuthLoginSession()`으로 로그인 결과를 받는다.
3. 토큰과 메타데이터를 저장한다.
4. 대시보드를 다시 연다.

### JSON import/export

- 가져오기: JSON 파일에서 계정 토큰을 읽어 저장한다.
- 내보내기: 현재 저장된 계정을 JSON 파일로 내보낸다.

### quota 새로고침

- 단일 계정 또는 전체 계정을 대상으로 동작한다.
- 새로고침 결과는 대시보드 카드 HTML로 다시 반영된다.

## 설정

`package.json`에서 제공하는 주요 설정:

- `codexMultiLogin.dashboardTheme`
- `codexMultiLogin.dashboardLocale`
- `codexMultiLogin.storageMode`

## 구현 시 주의사항

- 웹 호스트 모드에서는 로컬 파일과 keychain 의존 기능을 숨겨야 한다.
- 저장 모드 변경 시 사용자 경고와 설정 저장이 함께 맞물려야 한다.
- 대시보드 메시지 핸들러는 명령 문자열에 강하게 의존한다.
- 명령 이름과 실제 등록 이름이 어긋나지 않도록 관리해야 한다.

## 중요한 사실

- 프로젝트는 TypeScript 기반 VS Code 확장이다.
- `out/` 산출물을 배포에 사용한다.
- Web compatibility를 위해 `browser` entry point를 가진다.
- 확장 내부 상태는 `globalState`와 global storage를 함께 사용한다.

## 향후 작업 계획

- 계정 저장소와 대시보드 메시지 구조를 유지보수하기 쉽게 정리한다.
- 웹 호스트 모드와 데스크톱 모드의 기능 차이를 문서와 코드에서 같이 관리한다.
- JSON 형식과 storage 규칙이 바뀌면 관련 문서를 함께 갱신한다.
