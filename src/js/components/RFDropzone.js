import React, { Component, Fragment, isValidElement } from 'react'
import { bool, func, number, object, oneOfType, string } from 'prop-types'
import Dropzone from 'react-dropzone'
import classnames from 'classnames'
import Errors from './Errors'
import FailedToLoad from './FailedToLoad'
import Files from './Files'
import FileSelection from './FileSelection'
import LoadingFiles from './LoadingFiles'
import QueuedFiles from './QueuedFiles'
import createFilename from '../util/create-filename'
import l10n from '../util/l10n'
import validate from '../util/validate'

import {
  addErrors,
  addFilesToQueue,
  resetActiveFile,
  resetErroredFiles,
  setFirstQueuedFileAsActive,
  setFetchSuccessStatus,
  setFetchFailureStatus,
  toggleDisabledStatus,
  toggleFetchingStatus,
  toggleUploadingStatus,
  updateActiveFile
} from '../util/state-changes'

class RFDropzone extends Component {
  constructor(props) {
    super(props)
    this.state = {
      fetching: false,
      fetchedSuccessfully: false,
      disabled: false,
      uploading: false,
      queue: [],
      erroredFiles: []
    }
    this.dropzoneRef = React.createRef()
    // this.progressBarAutocompleteInterval
  }

  componentDidMount() {
    const { getFilesOnMount, delayInitialLoad } = this.props

    if (getFilesOnMount && !delayInitialLoad) {
      return this.getFiles()
    } else if (getFilesOnMount && delayInitialLoad) {
      this.toggleDisabledStatus()
      setTimeout(() => {
        this.toggleDisabledStatus()
        this.getFiles()
      }, delayInitialLoad)
    }
  }

  toggleDisabledStatus = () => {
    this.setState(toggleDisabledStatus)
  }

  getFiles = () => {
    const { getFilesOnMount, retryTimeout } = this.props

    this.setState(toggleFetchingStatus)

    return getFilesOnMount()
      .then(files => {
        this.addFilesToFormValues(files, true)
        this.setState(setFetchSuccessStatus)
      })
      .catch(() => {
        this.setState(setFetchFailureStatus)
        if (retryTimeout) {
          setTimeout(() => this.getFiles(), retryTimeout)
        }
      })
  }

  getCurrentFiles = () => {
    if (this.props.targetProp) {
      return this.props.input.value[this.props.targetProp] || []
    } else {
      return this.props.input.value || []
    }
  }

  openFileDialog = () => {
    this.dropzoneRef.current.open()
  }

  handleDrop = (acceptedFiles, rejectedFiles) => {
    if (!acceptedFiles.length && !rejectedFiles.length) return

    this.confirmUpload()
      .then(() => this.startUploadProcess(acceptedFiles, rejectedFiles))
  }

  startUploadProcess = (acceptedFiles, rejectedFiles) => {
    const files = [].concat(acceptedFiles, rejectedFiles)
    const validFiles = this.validateFiles(files, this.props)

    if (validFiles.length) {
      this.setState(toggleUploadingStatus)
      this.prepareFiles(validFiles).then(preparedFiles => {
        this.setState(addFilesToQueue(preparedFiles), this.processQueue)
      })
    }
  }

  confirmUpload = () => {
    return new Promise((resolve, reject) => {
      if (!this.props.allowMultiple && this.getCurrentFiles().length) {
        if (window.confirm(l10n('onlyOneFileAllowed'))) {
          return this.removeFile(this.getCurrentFiles()[0])
            .then(() => resolve())
            .catch(() => reject())
        } else {
          reject()
        }
      } else {
        resolve()
      }
    })
  }

  validateFiles = (files) => {
    const { validFiles, invalidFiles } = validate(files, this.props)

    this.setState(resetErroredFiles)
    this.setState(addErrors(invalidFiles))

    return validFiles
  }

  prepareFiles = (files) => {
    const filePreparationPromises = files.map((file, i) => this.prepareFile(file, i + 1))
    return Promise.all(filePreparationPromises)
  }

  prepareFile = (file, fileNumber) => {
    const fileReader = new FileReader()
    return new Promise(resolve => {
      fileReader.onload = (event) => {
        if (this.props.onFileReadSuccess) {
          this.props.onFileReadSuccess(event, file, fileNumber, resolve)
        } else {
          const base64EncodedContent = event.target.result.split(',')[1]
          resolve({
            name: createFilename(file, fileNumber, this.props),
            type: file.type,
            preview: file.preview,
            content: base64EncodedContent,
            status: 'PENDING'
          })
        }
      }
      fileReader.readAsDataURL(file)
    })
  }

  processQueue = () => {
    if (this.state.queue.length) {
      this.processNextFileInQueue()
    } else {
      return this.setState(toggleUploadingStatus)
    }
  }

  processNextFileInQueue = () => {
    this.setState(resetActiveFile)
    this.setState(setFirstQueuedFileAsActive, () => {
      this.uploadActiveFile()
        .then(this.addFilesToFormValues)
        .catch(this.handleUploadFailure)
        .finally(this.processQueue)
    })
  }

  uploadActiveFile = () => {
    const file = this.state.activeFile

    this.setState(updateActiveFile('status', 'UPLOADING'))

    return new Promise((resolve, reject) => {
      const _this = this
      const request = new XMLHttpRequest()
      // let completedBeforeFirstProgressEvent = false
      // let progressEventsFired = 0

      // request.upload.addEventListener('progress', handleUploadProgress)
      // request.upload.addEventListener('load', handleUploadCompletion)
      request.addEventListener('load', handleRequestCompletion)
      request.open('POST', this.props.uploadUrl, true)
      request.withCredentials = this.props.includeCredentials
      request.setRequestHeader('Content-Type', 'application/json')
      request.send(JSON.stringify({
        name: file.name,
        contentType: file.type,
        content: file.content
      }))

      // function handleUploadProgress(e) {
      //   console.log('handleUploadProgress', e);
      //   if (progressEventsFired === 0 && e.loaded === e.total) {
      //     completedBeforeFirstProgressEvent = true
      //   } else {
      //     const progressPercentage = e.progress / e.total * 100
      //     const clientSideThreshold = this.props.serverSideThreshold ?
      //       (this.props.serverSideThreshold - 100) : 80
      //     if (progressPercentage <= clientSideThreshold) {
      //       _this.setState(updateActiveFile('progress', progressPercentage))
      //     }
      //   }
      // }

      // function handleUploadCompletion() {
      //   console.log('@handleUploadCompletion - completedBeforeFirstProgressEvent: ', completedBeforeFirstProgressEvent);
      //   if (completedBeforeFirstProgressEvent) {
      //     _this.autocompleteClientSidePartOfRequestProgressBar()
      //   }
      // }

      function handleRequestCompletion(e) {
        const responseStatus = e.target.status
        if (responseStatus >= 200 && responseStatus < 300) {
          if (_this.props.onSuccess) {
            return _this.props.onSuccess(file)
              .then(location => resolve({ ...file, status: 'UPLOADED', location }))
          } else {
            return Promise.resolve(`${_this.props.uploadUrl}/${file.name}`)
              .then(location => resolve({ ...file, status: 'UPLOADED', location }))
          }
        } else {
          clearInterval(_this.progressBarAutocompleteInterval)
          reject({ ...file, status: 'DECLINED' })
        }
      }
    })
  }

  handleUploadFailure = (file) => {
    this.setState(resetActiveFile)
    this.setState(addErrors({ ...file, action: 'UPLOAD' }))
  }

  autocompleteClientSidePartOfRequestProgressBar = () => {
    let progressPercentage = 0
    return new Promise(resolve => {
      this.progressBarAutocompleteInterval = setInterval(() => {
        if (progressPercentage < 99) {
          this.setState(updateActiveFile('progress', progressPercentage))
          progressPercentage = progressPercentage + 3
        } else {
          clearInterval(this.progressBarAutocompleteInterval)
          resolve()
        }
      }, 1)
    })
  }

  autocompleteServerSidePartOfRequestProgressBar = () => {
    const serverSideThreshold = this.props.serverSideThreshold || 20
    const progressPercentage = this.state.activeFile.progress
    let iterations = 0

    if (this.progressBarAutocompleteInterval) {
      clearInterval(this.progressBarAutocompleteInterval)
    }

    return new Promise(resolve => {
      this.progressBarAutocompleteInterval = setInterval(() => {
        if ((100 - iterations - progressPercentage) !== 0) {
          this.setState(updateActiveFile('progress', (100 - serverSideThreshold + iterations)))
          iterations++
        } else {
          clearInterval(this.progressBarAutocompleteInterval)
          resolve()
        }
      }, 1)
    })
  }

  addFilesToFormValues = (files, replaceExisting = false) => {
    files = Array.isArray(files) ? files : [files]
    const field = this.props.input
    const target = field.value || []
    const targetProp = this.props.targetProp
    // const attachedStatusProp = this.props.attachedStatusProp
    let targetCopy = JSON.parse(JSON.stringify(target))

    if (replaceExisting) {
      if (targetProp) {
        targetCopy[targetProp] = files
      } else {
        targetCopy = files
      }
    } else {
      if (targetProp && targetCopy.hasOwnProperty(targetProp)) {
        targetCopy[targetProp] = targetCopy[targetProp].concat(files)
      } else if (targetProp) {
        targetCopy[targetProp] = files
      } else {
        targetCopy = targetCopy.concat(files)
      }
    }



    // if (attachedStatusProp) {
    //   targetCopy[attachedStatusProp] = true
    // }

    return field.onChange(targetCopy)
  }

  removeFile = (fileToRemove) => {
    const _this = this
    const request = new XMLHttpRequest()

    this.updateFileInFormValues(fileToRemove, 'status', 'REMOVING')

    return new Promise((resolve, reject) => {
      request.addEventListener('load', handleRequestCompletion)
      request.addEventListener('error', handleRequestFailure)
      request.open('DELETE', `${this.props.uploadUrl}/${fileToRemove.name}`, true)
      request.withCredentials = this.props.includeCredentials
      request.send()

      function handleRequestCompletion(e) {
        const responseStatus = e.target.status
        if (responseStatus >= 200 && responseStatus < 300) {
          _this.removeFileFromFormValues(fileToRemove)
          resolve()
        } else {
          handleRequestFailure(e)
        }
      }

      function handleRequestFailure() {
        _this.updateFileInFormValues(fileToRemove, 'status', 'UPLOADED')
        _this.setState(addErrors({ ...fileToRemove, action: 'REMOVE' }))
        reject()
      }
    })
  }

  removeFileFromFormValues = (fileToRemove) => {
    const field = this.props.input
    const targetProp = this.props.targetProp
    const attachedStatusProp = this.props.attachedStatusProp
    let targetCopy = JSON.parse(JSON.stringify(field.value))

    if (targetProp) {
      targetCopy[targetProp] = targetCopy[targetProp].filter(file => file.name !== fileToRemove.name)
    } else {
      targetCopy = targetCopy.filter(file => file.name !== fileToRemove.name)
    }

    if (attachedStatusProp) {
      targetCopy[attachedStatusProp] = false
    }

    return field.onChange(targetCopy)
  }

  updateFileInFormValues = (fileToUpdate, key, value) => {
    const field = this.props.input
    const target = field.value
    const targetProp = this.props.targetProp

    if (targetProp) {
      field.onChange({
        ...target,
        [targetProp]: updateTarget(target[targetProp])
      })
    } else {
      field.onChange(updateTarget(target))
    }

    function updateTarget(filesArray) {
      return filesArray.map(file => {
        if (file.name === fileToUpdate.name) {
          return { ...fileToUpdate, [key]: value }
        } else {
          return file
        }
      })
    }
  }

  renderLabel = () => {
    const { includeErrorIcon, label, meta: { error, warning } } = this.props

    if (label && typeof label === 'string') {
      return (
        <label className="upper-label">
          {(includeErrorIcon && (error || warning)) &&
            <span className="fas fa-asterisk text-warning" />
          }
          {label}
        </label>
      )
    } else if (label && typeof label === 'function') {
      return label()
    } else if (label && isValidElement(label)) {
      return <label />
    } else {
      return null
    }
  }

  renderDropzoneContent = () => {
    const {
      fetchedSuccessfully,
      fetching,
      queue,
      uploading,
      activeFile
    } = this.state

    const {
      input,
      targetProp,
      disabled,
      getFilesOnMount,
      delayInitialLoad,
      includeFileTypeIcon,
      showPreview
    } = this.props

    const files = targetProp ? input.value[targetProp] || [] : input.value
    const showLoadingIndicator = !fetching && fetchedSuccessfully ||
                                 !fetching && getFilesOnMount && delayInitialLoad ||
                                 !getFilesOnMount

    return (
      <Fragment>
        {fetching ?
          <LoadingFiles />
          : showLoadingIndicator ?
            <FileSelection
              openFileDialog={this.openFileDialog}
              disabled={disabled}
            />
            :
              <FailedToLoad />
        }
        {files.length > 0 &&
          <Files
            files={files}
            disabled={disabled}
            showPreview={showPreview}
            includeFileTypeIcon={includeFileTypeIcon}
            removeFile={this.removeFile}
          />
        }
        {uploading && activeFile &&
          <QueuedFiles
            activeFile={activeFile}
            showPreview={showPreview}
            pendingFiles={queue}
          />
        }
      </Fragment>
    )
  }

  renderFileRestrictions = () => {
    const { includeFileRestrictionsLegend, maxFileSize } = this.props
    if (includeFileRestrictionsLegend && maxFileSize) {
      return (
        <small className="text-muted text-nowrap">
          {l10n(
            'label.attachmentRestrictions',
            `Sallitut muodot: PDF, JPG, PNG. Koko enintään ${maxFileSize / 1024 / 1024}MB.`,
            [maxFileSize / 1024 / 1024]
          )}
        </small>
      )
    } else {
      return null
    }
  }


  render() {
    const {
      meta: { error, warning },
      acceptedFileFormats,
      className,
      alwaysEnabled,
      disabled: disabledViaProp
    } = this.props

    const { disabled: disabledViaState } = this.state

    const shouldDisable = disabledViaState || !alwaysEnabled && (disabledViaProp || !!error || !!warning)
    const dropzoneClassName = classnames(className, {
      'dropzone-disabled': shouldDisable
    })

    return (
      <div>
        {this.renderLabel()}
        <Dropzone
          className={dropzoneClassName}
          accept={acceptedFileFormats}
          disabled={shouldDisable}
          disableClick={true}
          multiple={this.props.allowMultiple}
          onDrop={this.handleDrop}
          style={{ opacity: shouldDisable ? '0.4' : '1' }}
          ref={this.dropzoneRef}
        >
          {this.renderDropzoneContent()}
        </Dropzone>
        {this.renderFileRestrictions()}
        {this.state.erroredFiles.length > 0 &&
          <Errors erroredFiles={this.state.erroredFiles} />
        }
      </div>
    )
  }
}

RFDropzone.defaultProps = {
  acceptedFileFormats: 'image/jpeg, image/png, application/pdf',
  alwaysEnabled: false,
  allowMultiple: true,
  className: 'dropzone',
  delayInitialLoad: undefined,
  disabled: false,
  includeCredentials: true,
  includeErrorIcon: false,
  includeFileTypeIcon: false,
  includeFileRestrictionsLegend: false,
  maxFileSize: undefined,
  showPreview: true,
}

RFDropzone.propTypes = {
  input: object.isRequired,
  meta: object.isRequired,
  uploadUrl: string.isRequired,
  acceptedFileFormats: string,
  alwaysEnabled: bool,
  allowMultiple: bool,
  attachedStatusProp: string,
  className: string,
  delayInitialLoad: number,
  disabled: bool,
  getFilesOnMount: func,
  includeCredentials: bool,
  includeErrorIcon: bool,
  includeFileRestrictionsLegend: bool,
  includeFileTypeIcon: bool,
  label: oneOfType([func, string]),
  maxFileSize: number,
  onFileReadSuccess: func,
  retryTimeout: number,
  serverSideThreshold: number,
  showPreview: bool,
  targetProp: string,
  // style: object,
}

export default RFDropzone
