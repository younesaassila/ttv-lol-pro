export default function toTitleCase(text: string) {
  return text.replace(
    /\w\S*/g,
    (word: string) =>
      word.charAt(0).toUpperCase() + word.substring(1).toLowerCase()
  );
}
