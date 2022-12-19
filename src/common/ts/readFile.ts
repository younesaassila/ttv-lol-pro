export default async function readFile(accept = "text/plain;charset=utf-8") {
  return new Promise<string>((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.addEventListener("change", async e => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return reject("No file selected");
      const data = await file.text();
      return resolve(data);
    });
    input.click();
  });
}
