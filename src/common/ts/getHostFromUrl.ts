export default function getHostFromUrl(url: string) {
  try {
    const Url = new URL(url);
    return Url.host;
  } catch {
    return null;
  }
}
