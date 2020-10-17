export async function verifyPermission(fileHandle: FileSystemHandle, withWrite: boolean = false) {
  const opts: any = {};
  if (withWrite) {
    opts.writable = true;
  }
  // Check if we already have permission, if so, return true.
  if (await fileHandle.queryPermission(opts) === 'granted') {
    return true;
  }
  // Request permission, if the user grants permission, return true.
  if (await fileHandle.requestPermission(opts) === 'granted') {
    return true;
  }
  // The user didn't grant permission, return false.
  return false;
}