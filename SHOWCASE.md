# Showcase metadata

이 저장소의 `showcase.json`은 GitHub 프로젝트 쇼케이스에서 `Codex_Multi_Login`를 표시하는 방식을 정의합니다. 규격 버전은 2입니다.

## 처리 방식

1. 쇼케이스가 GitHub API에서 공개 저장소의 기본 정보를 가져옵니다.
2. 저장소 기본 브랜치의 `showcase.json`을 1시간 캐시로 읽습니다.
3. 설정 파일의 값이 GitHub 기본 정보를 덮어씁니다.
4. `coverImage`가 비어 있으면 저장소명을 시드로 한 재현 가능한 무채색 패턴을 생성합니다.
5. `summary`가 비어 있으면 GitHub 저장소 설명을 사용합니다.
6. 설정 파일을 읽지 못하면 GitHub 기본 정보만 사용합니다.
7. 비공개 또는 보관된 저장소는 표시하지 않습니다.

## version 2 필드

| 필드 | 형식 | 설명 |
| --- | --- | --- |
| `version` | number | 규격 버전. 현재 값은 `2` |
| `repository` | string | 실제 GitHub 저장소명 |
| `enabled` | boolean | 쇼케이스 노출 여부 |
| `featured` | boolean | 대표 프로젝트 여부 |
| `order` | number | 전체 노출 순서 |
| `category` | string | 프로젝트 카테고리 |
| `title` | string | 화면에 표시할 프로젝트명 |
| `summary` | string | 프로젝트 한 줄 설명 |
| `tags` | string[] | 검색과 카드에 사용하는 태그 |
| `status` | string | 프로젝트 상태 메타데이터 |
| `platforms` | string[] | 지원 환경 또는 실행 형태 |
| `highlights` | string[3] | 카드에 표시할 주요 기능 3개 |
| `demoUrl` | string | 배포 데모 주소 |
| `downloadUrl` | string | 다운로드 또는 릴리스 주소 |
| `coverImage` | string | 프로젝트 대표 이미지 주소 |
| `accent` | string | 시각 스타일. 현재는 `neutral` |

## 수정 규칙

- `repository` 값은 실제 저장소명과 정확히 일치해야 합니다.
- JSON 문법 오류가 없어야 합니다.
- `highlights`는 짧은 문장 정확히 3개를 사용합니다.
- 대표 프로젝트는 `featured: true`와 고유한 `order`를 사용합니다.
- 대표 이미지가 없으면 `coverImage`를 빈 문자열로 유지합니다.
- 무채색 디자인은 `accent: "neutral"`을 사용합니다.
