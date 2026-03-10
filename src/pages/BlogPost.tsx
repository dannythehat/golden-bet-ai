import { useParams, Link } from 'react-router-dom';
import '@/styles/blog-article.css';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Calendar, Clock, Tag, User, Share2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import footyOracleLogo from '@/assets/footy-oracle-logo.webp';
import { useEffect, useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface BlogPostData {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  hero_image_url: string | null;
  category: string;
  tags: string[];
  author: string;
  post_type: string;
  reading_time_minutes: number;
  published_at: string;
  seo_title: string | null;
  seo_description: string | null;
}

const categoryLabels: Record<string, string> = {
  'match-preview': '⚽ Match Preview',
  'weekly-roundup': '📊 Weekly Roundup',
  'guide': '📚 Guide',
  'analysis': '🔬 Analysis',
  'funny-story': '😂 Funny Story',
  'betting-news': '📰 Betting News',
  'ai-ml-insight': '🤖 AI Insight',
  'morning-briefing': '🌅 Morning Briefing',
  'challenge': '🏆 €100→€1K Challenge',
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/** Fix relative image URLs that point to supabase storage */
function fixImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/lovable-uploads/')) {
    return `${SUPABASE_URL}/storage/v1/object/public/lovable-uploads${url.replace('/lovable-uploads', '')}`;
  }
  return url;
}

/** Sanitize HTML content — wrap loose text nodes in <p> tags */
function sanitizeHtml(html: string): string {
  // Split on block-level tags, wrap any loose text in <p>
  const blockTags = /(<\/?(?:h[1-6]|p|div|ul|ol|li|blockquote|table|thead|tbody|tr|th|td|hr|pre|figure|figcaption|section|article|header|footer|nav|aside|details|summary)[^>]*>)/gi;
  const parts = html.split(blockTags);
  return parts.map(part => {
    // If it's a tag, pass through
    if (blockTags.test(part)) return part;
    // Reset regex lastIndex
    blockTags.lastIndex = 0;
    // If it's only whitespace, skip
    const trimmed = part.trim();
    if (!trimmed) return part;
    // If it contains only inline content (not wrapped in block tag), wrap in <p>
    if (!trimmed.startsWith('<')) {
      return `<p>${trimmed}</p>`;
    }
    return part;
  }).join('');
}

/** Strip JSON wrapper if AI returned { "title": "...", "content": "..." } */
function stripJsonWrapper(raw: string): string {
  let s = raw.trim();

  // Case 1: Raw JSON string
  if (s.startsWith('{') && s.includes('"content"')) {
    try {
      const parsed = JSON.parse(s);
      if (parsed.content) return parsed.content;
    } catch {
      const contentMatch = s.match(/"content"\s*:\s*"([\s\S]*)"\s*\}?\s*$/);
      if (contentMatch) {
        return contentMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      }
    }
  }

  // Case 2: HTML-wrapped JSON (the AI output was sanitized with the wrapper still in place)
  // e.g. <p>{<br/>  "title": "...", "content": "</p><h2>actual content...
  const htmlJsonPattern = /^<p>\s*\{[\s\S]*?"content"\s*:\s*"<\/p>\s*/i;
  if (htmlJsonPattern.test(s)) {
    s = s.replace(htmlJsonPattern, '');
  }

  return s;
}

/** Detect if content is markdown (not HTML) and convert, then sanitize */
function renderContent(raw: string): string {
  // Step 1: Strip any JSON wrapper
  let cleaned = stripJsonWrapper(raw);
  
  // Step 2: Replace literal \n\n and \n with actual newlines (AI artifacts)
  cleaned = cleaned.replace(/\\n\\n/g, '\n\n').replace(/\\n/g, '\n');
  
  // Step 3: Remove <p>\n\n</p> or <p>\n</p> artifacts
  cleaned = cleaned.replace(/<p>\s*\\?n\\?n?\s*<\/p>/gi, '');
  
  // Step 4: Remove nested <p><p>...</p></p>
  cleaned = cleaned.replace(/<p>\s*<p>/gi, '<p>').replace(/<\/p>\s*<\/p>/gi, '</p>');
  
  // Step 5: Remove <h2><p>...</p></h2> → <h2>...</h2> (nested block tags)
  cleaned = cleaned.replace(/<(h[1-6])>\s*<p>([\s\S]*?)<\/p>\s*<\/\1>/gi, '<$1>$2</$1>');

  const trimmed = cleaned.trim();
  let html: string;
  if (trimmed.startsWith('<h') || trimmed.startsWith('<p') || trimmed.startsWith('<div')) {
    html = sanitizeHtml(trimmed);
  } else {
    html = marked.parse(trimmed, { async: false }) as string;
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'img', 'br', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div', 'span', 'figure', 'figcaption', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'details', 'summary', 'sup', 'sub', 'del', 'ins', 'mark', 'small', 'abbr', 'cite', 'dfn', 'kbd', 'samp', 'var', 'time', 'data', 'dl', 'dt', 'dd', 'caption', 'col', 'colgroup'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel', 'width', 'height', 'loading', 'datetime', 'style'],
  });
}

function SocialShareButtons({ title, url }: { title: string; url: string }) {
  const encoded = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const buttons = [
    {
      label: 'Share on X',
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encoded}`,
      icon: (
        <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Share on Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
      icon: (
        <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
    {
      label: 'Share on WhatsApp',
      href: `https://wa.me/?text=${encodedTitle}%20${encoded}`,
      icon: (
        <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        <Share2 className="w-3.5 h-3.5" /> Share:
      </span>
      {buttons.map((btn) => (
        <a
          key={btn.label}
          href={btn.href}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 rounded-full bg-foreground/10 hover:bg-foreground/20 flex items-center justify-center transition-colors"
          aria-label={btn.label}
        >
          {btn.icon}
        </a>
      ))}
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
      if (error) throw error;
      return data as BlogPostData;
    },
    enabled: !!slug,
  });

  const postUrl = `https://thefootyoracle.com/blog/${slug}`;
  const heroImage = fixImageUrl(post?.hero_image_url ?? null);
  const renderedContent = useMemo(() => post ? renderContent(post.content) : '', [post]);

  // Dynamic SEO meta tags
  useEffect(() => {
    if (!post) return;
    const title = post.seo_title || post.title;
    const description = post.seo_description || post.excerpt;
    document.title = `${title} | The Footy Oracle Blog`;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(name.startsWith('og:') || name.startsWith('article:') ? 'property' : 'name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('description', description);
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:type', 'article');
    setMeta('og:url', postUrl);
    if (heroImage) setMeta('og:image', heroImage);
    setMeta('article:published_time', post.published_at);
    setMeta('article:author', post.author);
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', title);
    setMeta('twitter:description', description);
    if (heroImage) setMeta('twitter:image', heroImage);

    return () => {
      document.title = 'The Footy Oracle — AI-Powered Football Predictions';
    };
  }, [post, heroImage]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-3xl px-4">
          <div className="h-8 bg-muted rounded w-3/4" />
          <div className="h-64 bg-muted rounded-xl" />
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="text-5xl">🔍</span>
          <h1 className="text-2xl font-bold">Article Not Found</h1>
          <p className="text-muted-foreground">This article doesn't exist or has been removed.</p>
          <Link to="/blog">
            <Button className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  // JSON-LD structured data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: heroImage || undefined,
    author: {
      '@type': 'Person',
      name: post.author,
      description: 'AI-powered football analyst combining 15+ years of historical data with machine learning models across 130+ leagues.',
      url: 'https://thefootyoracle.com/blog',
    },
    publisher: {
      '@type': 'Organization',
      name: 'The Footy Oracle',
      logo: { '@type': 'ImageObject', url: 'https://thefootyoracle.com/favicon.png' },
      url: 'https://thefootyoracle.com',
    },
    datePublished: post.published_at,
    dateModified: post.published_at,
    mainEntityOfPage: { '@type': 'WebPage', '@id': postUrl },
    url: postUrl,
    keywords: post.tags?.join(', '),
    articleSection: post.category,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-gradient-to-r from-background via-card/95 to-background">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src={footyOracleLogo} alt="The Footy Oracle" className="w-10 h-10 rounded-lg object-cover border border-primary/30" />
              <span className="font-bold text-primary">The Footy Oracle</span>
            </Link>
            <div className="flex items-center gap-2">
              <Link to="/blog">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                  <ArrowLeft className="w-4 h-4" /> Blog
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-3xl">
        {/* Category + Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {categoryLabels[post.category] || post.category}
          </Badge>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(post.published_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {post.reading_time_minutes} min read
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-6">
          {post.title}
        </h1>

        {/* Author + Social Share */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
              <User className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{post.author}</p>
              <p className="text-xs text-muted-foreground">AI Football Analyst • 130+ Leagues</p>
            </div>
          </div>
          <SocialShareButtons title={post.title} url={postUrl} />
        </div>

        {/* Hero Image or Video */}
        {heroImage && (
          <div className="rounded-xl overflow-hidden mb-8 border border-border/30">
            {heroImage.endsWith('.mp4') || heroImage.endsWith('.webm') ? (
              <video
                src={heroImage}
                className="w-full h-auto max-h-96 object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={heroImage}
                alt={post.title}
                className="w-full h-auto max-h-96 object-cover"
                loading="lazy"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div
          className="blog-article-content prose prose-invert prose-lg max-w-none
            prose-headings:text-foreground prose-headings:font-bold
            prose-p:text-muted-foreground prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-blockquote:border-l-gold prose-blockquote:bg-gold/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4
            prose-li:text-muted-foreground
            prose-img:rounded-xl
            prose-hr:border-border/30"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border/30">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-muted-foreground" />
              {post.tags.map(tag => (
                <Badge key={tag} variant="outline" className="text-xs text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Social Share Bottom */}
        <div className="mt-8 pt-6 border-t border-border/30 flex items-center justify-between flex-wrap gap-4">
          <p className="text-sm text-muted-foreground">Enjoyed this? Share it with your mates 👇</p>
          <SocialShareButtons title={post.title} url={postUrl} />
        </div>

        {/* CTA */}
        <div className="mt-12 glass-card rounded-xl p-6 text-center space-y-3">
          <h3 className="text-xl font-bold">Want today's AI picks?</h3>
          <p className="text-muted-foreground text-sm">Get The Gaffer's Golden Bets, Bet Builder, and ACCA Delight — updated daily at 6 AM UTC.</p>
          <Link to="/">
            <Button className="gap-2 mt-2">View Today's Predictions</Button>
          </Link>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} The Footy Oracle — AI-Powered Football Predictions</p>
      </footer>
    </div>
  );
}
