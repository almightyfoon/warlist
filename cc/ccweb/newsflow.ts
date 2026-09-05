import { marked } from "marked";
import DOMPurify from "dompurify";
import { Flow, el } from "./widgets";

export interface NewsPost {
    post_type:   string;
    date_posted: string;
    title:       string;
    post_text:   string;
}

// 'loading': the /blog fetch hasn't resolved yet (first-load or a retry).
// 'loaded':  it resolved successfully -- posts may legitimately be empty.
// 'error':   it failed; the caller may retry and move back to 'loading'.
export type NewsLoadStatus = 'loading' | 'loaded' | 'error';

const EMPTY_MESSAGE: Record<NewsLoadStatus, string> = {
    loading: 'Loading updates…',
    loaded:  'No updates yet — check back soon.',
    error:   'Could not load updates — check your connection.',
};

// Release bodies are Markdown (GitHub renders them that way too); parse and
// sanitize before inserting, since this is maintainer-authored HTML now.
function markdownDiv(cls: string, markdown: string): HTMLDivElement {
    const d = el('div', cls);
    const html = marked.parse(markdown, { async: false, breaks: true, gfm: true });
    d.innerHTML = DOMPurify.sanitize(html as string);
    return d;
}

// Full-page replacement for the old raw #blog overlay: a proper Flow, so it
// participates in Flow.hideFlows()/show() like every other view instead of
// being manually toggled alongside whatever else happens to be showing.
export class NewsFlow extends Flow {
    private listDiv: HTMLDivElement;

    constructor(onBack?: () => void) {
        super('mk4news');

        const inner = el('div', 'mk4news-inner');
        this.content.appendChild(inner);

        const backBtn = el('button', 'mk4-back-btn', '← Back');
        backBtn.onclick = () => {
            if (onBack) onBack();
            window.history.back();
        };
        inner.appendChild(backBtn);

        inner.appendChild(el('div', 'mk4-section-title', 'Latest Updates'));

        this.listDiv = el('div', 'mk4news-list');
        inner.appendChild(this.listDiv);
    }

    renderPosts(posts: NewsPost[], status: NewsLoadStatus): void {
        this.listDiv.innerHTML = '';

        if (posts.length === 0) {
            this.listDiv.appendChild(el('div', 'mk4-empty-slot', EMPTY_MESSAGE[status]));
            return;
        }

        for (const post of posts) {
            const card = el('div', 'mk4news-post');
            card.appendChild(el('div', 'mk4news-post-date',  post.date_posted));
            card.appendChild(el('div', 'mk4news-post-title', post.title));
            card.appendChild(markdownDiv('mk4news-post-body', post.post_text));
            this.listDiv.appendChild(card);
        }
    }
}
