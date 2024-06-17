const getFaviconUrl = (url, size=32) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
    } catch (error) {
      console.error('Invalid URL:', error);
      return '/path/to/default/favicon.ico';
    }
  };

export default getFaviconUrl;