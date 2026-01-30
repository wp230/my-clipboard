# My Clipboard

GNOME Shell 46용 클립보드 매니저 확장 프로그램입니다.
텍스트와 이미지 클립보드 히스토리를 관리하고, 세션 간 영구 저장을 지원합니다.

## 기능

- 클립보드 히스토리 자동 저장 (텍스트 + 이미지)
- 상단 패널 아이콘으로 빠른 접근
- 키보드 단축키로 팝업 토글
- 숫자 키(1-9)로 항목 빠른 선택
- 선택 시 자동 붙여넣기
- 이미지 썸네일 미리보기
- 세션 종료 후에도 히스토리 유지
- 중복 항목 자동 제거 (텍스트 및 이미지)
- 설정 UI로 동작 커스터마이징

## 설치

### GitHub에서 직접 설치

```bash
git clone https://github.com/wp230/my-clipboard.git
cd my-clipboard
cp -r . ~/.local/share/gnome-shell/extensions/my-clipboard@kwon/
```

스키마 컴파일:

```bash
glib-compile-schemas ~/.local/share/gnome-shell/extensions/my-clipboard@kwon/schemas/
```

GNOME Shell 재시작:

- **Wayland**: 로그아웃 후 다시 로그인
- **X11**: `Alt + F2` -> `r` 입력 -> Enter

### 확장 활성화

```bash
gnome-extensions enable my-clipboard@kwon
```

## 사용법

### 기본 단축키

| 단축키 | 동작 |
|--------|------|
| `Super + V` | 클립보드 팝업 열기/닫기 |
| `1` ~ `9` | 팝업에서 해당 번호 항목 선택 |

### 사용 흐름

1. 아무 앱에서 텍스트 또는 이미지를 복사합니다
2. `Super + V`를 누르거나 상단 패널의 클립보드 아이콘을 클릭합니다
3. 원하는 항목을 클릭하거나 숫자 키로 선택합니다
4. 선택한 항목이 클립보드에 설정되고 자동으로 붙여넣기됩니다

### 히스토리 초기화

팝업 하단의 **Clear All** 버튼을 클릭하면 모든 히스토리가 삭제됩니다.

## 설정

상단 패널 아이콘 우클릭 -> **Settings** 또는 아래 명령어로 설정 창을 엽니다:

```bash
gnome-extensions prefs my-clipboard@kwon
```

### 설정 항목

| 항목 | 기본값 | 범위 | 설명 |
|------|--------|------|------|
| Maximum history size | 50 | 5 ~ 200 | 보관할 클립보드 항목 수 |
| Text preview length | 200 | 50 ~ 500 | 미리보기에 표시할 최대 글자 수 |
| Store images | ON | ON/OFF | 이미지 클립보드 저장 여부 |
| Thumbnail size | 64px | 32 ~ 256 | 이미지 썸네일 크기 |

## 파일 구조

```
my-clipboard@kwon/
├── extension.js          # 확장 진입점 (enable/disable)
├── prefs.js              # 설정 UI
├── metadata.json         # 확장 메타데이터
├── stylesheet.css        # 팝업 스타일
├── schemas/
│   └── org.gnome.shell.extensions.my-clipboard.gschema.xml
└── src/
    ├── clipboardManager.js   # 클립보드 감시 및 히스토리 관리
    ├── clipboardPopup.js     # 팝업 UI 및 키보드 입력 처리
    ├── historyManager.js     # 히스토리 파일 저장/로드
    └── imageHandler.js       # 이미지 썸네일 생성
```

## 데이터 저장 경로

- 히스토리: `~/.cache/my-clipboard/history.json`
- 이미지: `~/.cache/my-clipboard/images/`

## 요구 사항

- GNOME Shell 46
- GJS (GNOME JavaScript)

## 제거

```bash
gnome-extensions disable my-clipboard@kwon
rm -rf ~/.local/share/gnome-shell/extensions/my-clipboard@kwon/
rm -rf ~/.cache/my-clipboard/
```

## 변경 이력

### v1.0.1

- 히스토리 상한 초과 시 제거된 이미지 항목의 메모리(bytes)를 명시적으로 해제하여 메모리 누수 수정
- 팝업이 닫혀 있을 때 메뉴 재구축을 지연(lazy rebuild)하여 불필요한 위젯 생성 방지
- 가상 키보드 디바이스를 재사용(싱글톤)하여 매 붙여넣기마다 새 디바이스 생성되던 리소스 누수 수정
- `_saveImage()`에서 사용하지 않는 `bytes.get_data()` 호출 제거 (불필요한 메모리 복사 방지)
- `save()` 메서드가 원본 히스토리 항목을 직접 변경(mutate)하지 않도록 수정
- 이미지 클립보드 중복 제거 로직 추가 (텍스트와 동일하게 동작)

### v1.0.0

- 최초 릴리스
- 텍스트/이미지 클립보드 히스토리 관리
- 영구 저장 및 세션 간 유지
- 키보드 단축키 지원
- 설정 UI

## 라이선스

MIT
