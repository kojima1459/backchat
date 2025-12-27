import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

type SeoHeadProps = {
    title?: string;
    description?: string;
    keywords?: string;
    image?: string;
    type?: 'website' | 'article' | 'application';
    structuredData?: Record<string, unknown>;
};

const SITE_NAME = 'The ToDo';
const BASE_URL = 'https://shiretto-todo-chat.web.app';
const DEFAULT_DESCRIPTION = 'ADHDでも回る“止める設計”のToDoアプリ。インボックス統合、AI段取り分解、過集中ストップ機能搭載。';
// TODO: Replace with actual OGP image URL when available. Using app icon or a screenshot placeholder for now.
const DEFAULT_IMAGE = `${BASE_URL}/icon-512.png`;

export const SeoHead = ({
    title,
    description = DEFAULT_DESCRIPTION,
    keywords,
    image = DEFAULT_IMAGE,
    type = 'website',
    structuredData,
}: SeoHeadProps) => {
    const { pathname } = useLocation();
    const canonicalUrl = `${BASE_URL}${pathname}`;
    const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    return (
        <Helmet>
            {/* Basic Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            {keywords && <meta name="keywords" content={keywords} />}
            <link rel="canonical" href={canonicalUrl} />

            {/* OGP Tags */}
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content={image} />
            <meta property="og:type" content={type} />
            <meta property="og:locale" content="ja_JP" />

            {/* Twitter Card Tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={image} />
            <meta name="twitter:creator" content="@kojima920" />

            {/* Structured Data (JSON-LD) */}
            {structuredData && (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            )}
        </Helmet>
    );
};
