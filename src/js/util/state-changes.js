export const addErrors = (erroredFiles) => (state) => ({
  erroredFiles: state.erroredFiles.concat(erroredFiles)
})

export const addFilesToQueue = (files) => (state) => ({
  queue: state.queue.concat(files)
})

export const resetActiveFile = () => ({
  activeFile: null
})

export const resetFailedUploads = () => ({
  failedUploads: []
})

export const setFirstQueuedFileAsActive = (state) => ({
  activeFile: state.queue.slice(0, 1)[0],
  queue: state.queue.slice(1)
})

export const toggleFetchingStatus = (state) => ({
  fetching: !state.fetching
})

export const toggleUploadingStatus = (state) => ({
  uploading: !state.uploading
})

export const updateActiveFile = (key, value) => (state) => ({
  activeFile: { ...state.activeFile, [key]: value }
})
