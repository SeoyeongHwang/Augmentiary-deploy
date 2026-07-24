/**
 * 일기 본문(content_html) 렌더링용 HTML 살균 유틸
 *
 * Tiptap 에디터가 생성하는 태그·속성만 허용하고 나머지는 제거한다.
 * DOMParser로 파싱하므로 script 실행이나 리소스 로딩 없이 안전하게 처리된다.
 * (클라이언트 전용 — SSR 시점에는 빈 문자열을 반환하지만,
 *  본문을 렌더링하는 모달은 사용자 인터랙션 후에만 열리므로 문제 없다)
 */

// Tiptap StarterKit + AIHighlight(mark)가 생성하는 태그들
const ALLOWED_TAGS = new Set([
  'p', 'br', 'span', 'div',
  'strong', 'b', 'em', 'i', 's', 'u', 'mark',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre', 'hr',
])

// 어떤 경우에도 통째로 제거해야 하는 태그들
const DROP_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta',
  'form', 'input', 'button', 'textarea', 'select', 'base', 'svg', 'math',
])

// AIHighlight 마크가 사용하는 커스텀 속성들
const ALLOWED_ATTRS = new Set([
  'ai-text', 'request-id', 'category', 'data-original', 'edit-ratio',
])

// style 속성은 AI 하이라이트 배경색만 허용
const SAFE_STYLE_PATTERN = /^\s*background-color\s*:\s*(rgba?\([\d.,\s]+\)|transparent|#[0-9a-fA-F]{3,8})\s*;?\s*$/

function sanitizeElement(element: Element): void {
  for (const child of Array.from(element.children)) {
    const tag = child.tagName.toLowerCase()

    if (DROP_TAGS.has(tag)) {
      child.remove()
      continue
    }

    if (!ALLOWED_TAGS.has(tag)) {
      // 허용되지 않은 태그는 벗겨내고 자식 노드만 유지
      sanitizeElement(child)
      child.replaceWith(...Array.from(child.childNodes))
      continue
    }

    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase()
      if (name === 'style') {
        if (!SAFE_STYLE_PATTERN.test(attr.value)) {
          child.removeAttribute(attr.name)
        }
      } else if (!ALLOWED_ATTRS.has(name)) {
        child.removeAttribute(attr.name)
      }
    }

    sanitizeElement(child)
  }
}

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return ''
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  sanitizeElement(doc.body)
  return doc.body.innerHTML
}

/**
 * HTML에서 텍스트만 추출 (미리보기용)
 * DOMParser 기반이라 detached div + innerHTML 방식과 달리 리소스 로딩이 일어나지 않는다.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return ''
  }

  const doc = new DOMParser().parseFromString(html, 'text/html')
  return doc.body.textContent || ''
}
