export default function saveFile(
  filename: string,
  content: string,
  type = "text/plain;charset=utf-8"
) {
  const a = document.createElement("a");
  a.setAttribute("href", `data:${type},` + encodeURIComponent(content));
  a.setAttribute("download", filename);
  a.click();
}
