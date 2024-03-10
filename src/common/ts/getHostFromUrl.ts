export default function getHostFromUrl(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
