export default function toAbsoluteUrl(url: string): string {
  try {
    const Url = new URL(url, location.href);
    return Url.href;
  } catch {
    return url;
  }
}
