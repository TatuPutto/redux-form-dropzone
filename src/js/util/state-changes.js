
export const addFilesToQueue = (files) => (state) => ({
  queue: state.queue.concat(files)
})

export const addFilesToFailedUploads = (files) => (state) => ({
  failedUploads: state.failedUploads.concat(files)
})

export const resetFailedUploads = (state) => ({
  failedUploads: []
})

export const updateActiveFile = (key, value) => (state) => ({
  activeFile: { ...state.activeFile, [key]: value }
})
