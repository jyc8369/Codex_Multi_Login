# Showcase metadata

이 저장소의 `showcase.json`은 GitHub 프로젝트 쇼케이스에서 `Codex_Multi_Login`을 표시하는 방식을 정의합니다.

## 처리 방식

1. 쇼케이스가 GitHub API에서 저장소의 기본 정보를 가져옵니다.
2. 저장소 루트의 `showcase.json`을 읽습니다.
3. 설정 파일의 값이 GitHub 기본 정보를 덮어씁니다.
4. `summary`가 비어 있으면 GitHub 저장소 설명을 사용합니다.
5. 설정 파일을 읽지 못하면 GitHub 기본 정보만 사용합니다.
6. 보관된 저장소는 표시하지 않습니다.

## 필드

| 필드 | 설명 |
| --- | --- |
| `version` | 설정 규격 버전 |
| `repository` | 실제 GitHub 저장소명 |
| `enabled` | 쇼케이스 노출 여부 |
| `featured` | 대표 프로젝트 여부 |
| `order` | 전체 노출 순서 |
| `category` | 프로젝트 카테고리 |
| `summary` | 사용자 지정 설명. 빈 문자열이면 GitHub 설명 사용 |
| `tags` | 화면에 표시할 태그 |
| `demoUrl` | 배포 데모 주소 |
| `coverImage` | 프로젝트 대표 이미지 주소 |

## 수정 규칙

- `repository` 값은 실제 저장소명과 정확히 일치해야 합니다.
- JSON 문법 오류가 없어야 합니다.
- 대표 프로젝트는 `featured: true`와 고유한 `order`를 사용합니다.
- 설명을 별도로 관리하지 않으면 `summary`를 빈 문자열로 유지합니다.
