// From https://parceljs.org/features/dependency-resolution/#configuring-other-tools
declare module "url:*" {
  const value: string;
  export default value;
}
