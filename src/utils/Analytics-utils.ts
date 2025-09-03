import { analytics } from '../firebase/config';
import { logEvent } from "firebase/analytics";
import { getOrCreateSessionId } from './sessionUtils';

// Page Views
export const trackPageView = (pageName: string, additionalData = {}) => {
  logEvent(analytics, 'page_view', {
    page_name: pageName,
    page_path: window.location.pathname,
    ...additionalData
  });
};

// Novel Interactions
export const trackNovelView = (novelId: string, novelData: any) => {
  logEvent(analytics, 'novel_view', {
    novel_id: novelId,
    novel_title: novelData.title,
    novel_author: novelData.authorName,
    novel_genres: novelData.genres,
    timestamp: new Date().toISOString()
  });
};

export const trackChapterRead = (novelId: string, chapterData: any) => {
  logEvent(analytics, 'chapter_read', {
    novel_id: novelId,
    chapter_title: chapterData.title,
    chapter_number: chapterData.number,
    timestamp: new Date().toISOString()
  });
};

// User Actions
export const trackUserRegistration = (userId: string, method: string) => {
  logEvent(analytics, "sign_up", {
    method: method,
    user_id: userId
  });
};

export const trackNovelInteraction = (
  type: 'like' | 'comment',
  data: {
    novelId: string;
    userId: string;
    novelTitle?: string;
    authorId?: string;
    commentId?: string;
    commentText?: string;
  }
) => {
  if (!analytics) return;

  logEvent(analytics, `novel_${type}`, {
    ...data,
    timestamp: new Date().toISOString()
  });
};

// User Engagement
export const trackEngagementTime = (pageType: string, timeInSeconds: number) => {
  logEvent(analytics, 'user_engagement', {
    page_type: pageType,
    time_spent: timeInSeconds,
    timestamp: new Date().toISOString()
  });
};

export const trackNovelRead = (novelData: {
  novelId: string;
  chapterIndex: number;
  title: string;
  isAnonymous?: boolean;
}) => {
  if (!analytics) return;

  const sessionId = getOrCreateSessionId();
  
  logEvent(analytics, 'novel_read', {
    ...novelData,
    reader_type: novelData.isAnonymous ? 'anonymous' : 'registered',
    session_id: sessionId,
    timestamp: new Date().toISOString()
  });
};

export const trackAnonymousPageView = (pageData: {
  pageName: string;
  novelId?: string;
  chapterIndex?: number;
}) => {
  if (!analytics) return;

  const sessionId = getOrCreateSessionId();

  logEvent(analytics, 'anonymous_page_view', {
    ...pageData,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    referrer: document.referrer,
    user_agent: navigator.userAgent
  });
};