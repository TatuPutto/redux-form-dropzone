import React, { Component, Fragment, isValidElement } from 'react'
import { bool, func, number, object, oneOfType, string } from 'prop-types'
import Dropzone from 'react-dropzone'
import Errors from './Errors'
import Files from './Files'
import QueuedFiles from './QueuedFiles'
import createFilename from '../util/create-filename'
import l10n from '../util/l10n'
import validate from '../util/validate'

import {
  addErrors,
  addFilesToQueue,
  resetActiveFile,
  resetFailedUploads,
  setFirstQueuedFileAsActive,
  toggleFetchingStatus,
  toggleUploadingStatus,
  updateActiveFile
} from '../util/state-changes'

class RFDropzone extends Component {
  constructor(props) {
    super(props)
    this.state = {
      fetching: props.getFilesOnMount ? true : false,
      uploading: false,
      queue: [],
      erroredFiles: [],
    }
    this.dropzoneRef = React.createRef()
    this.progressBarAutocompleteInterval
  }

  componentDidMount() {
    if (this.props.getFilesOnMount) {
      this.getFiles()
    }
  }

  getFiles = () => {
    this.props.getFilesOnMount().then(files => {
      this.setState(toggleFetchingStatus)
      if (files.length) {
        this.addFilesToFormValues(files)
      }
    })
  }

  openFileDialog = () => {
    this.dropzoneRef.current.open()
  }

  handleDrop = (acceptedFiles, rejectedFiles) => {
    const files = [].concat(acceptedFiles, rejectedFiles)
    const validFiles = this.validateFiles(files, this.props)

    if (validFiles.length) {
      this.setState(toggleUploadingStatus)
      this.prepareFiles(validFiles).then(preparedFiles => {
        this.setState(addFilesToQueue(preparedFiles), this.processQueue)
      })
    }
  }

  validateFiles = (files) => {
    const { validFiles, invalidFiles } = validate(files, this.props)

    this.setState(resetFailedUploads)
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
      let completedBeforeFirstProgressEvent = false
      let progressEventsFired = 0

      request.upload.addEventListener('progress', handleUploadProgress)
      request.upload.addEventListener('load', handleUploadCompletion)
      request.addEventListener('load', handleRequestCompletion)
      request.open('POST', this.props.uploadUrl, true)
      request.withCredentials = this.props.includeCredentials
      request.setRequestHeader('Content-Type', 'application/json')
      request.send(JSON.stringify({
        name: file.name,
        contentType: file.type,
        content: file.content
      }))

      function handleUploadProgress(e) {
        if (progressEventsFired === 0 && e.loaded === e.total) {
          completedBeforeFirstProgressEvent = true
        } else {
          const progressPercentage = e.progress / e.total * 100
          const clientSideThreshold = this.props.serverSideThreshold ?
            (this.props.serverSideThreshold - 100) : 80
          if (progressPercentage <= clientSideThreshold) {
            _this.setState(updateActiveFile('progress', progressPercentage))
          }
        }
      }

      function handleUploadCompletion() {
        if (completedBeforeFirstProgressEvent) {
          _this.autocompleteClientSidePartOfRequestProgressBar()
        }
      }

      function handleRequestCompletion(e) {
        const responseStatus = e.currentTarget.status
        if (responseStatus >= 200 && responseStatus < 300) {
          _this.autocompleteServerSidePartOfRequestProgressBar()
            .then(() => _this.props.onSuccess(file) || Promise.resolve())
            .then(location => resolve({ ...file, status: 'UPLOADED', location }))
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
        if (progressPercentage <= 80) {
          this.setState(updateActiveFile('progress', progressPercentage))
          progressPercentage++
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

  addFilesToFormValues = (files) => {
    files = Array.isArray(files) ? files : [files]
    const field = this.props.input
    const target = field.value
    const targetCopy = JSON.parse(JSON.stringify(target))
    const targetProp = this.props.targetProp

    if (targetProp && targetCopy.hasOwnProperty(targetProp)) {
      targetCopy[targetProp] = targetCopy[targetProp].concat(files)
    } else if (targetProp) {
      targetCopy[targetProp] = files
    } else {
      targetCopy.concat(files)
    }

    return field.onChange(targetCopy)
  }

  removeFile = (fileToRemove) => {
    const _this = this
    const request = new XMLHttpRequest()

    this.updateFileInFormValues(fileToRemove, 'status', 'REMOVING')

    request.addEventListener('load', handleRequestCompletion)
    request.addEventListener('error', handleRequestFailure)
    request.open('DELETE', `${this.props.uploadUrl}/${fileToRemove.name}`, true)
    request.withCredentials = this.props.includeCredentials
    request.send()

    function handleRequestCompletion(e) {
      const responseStatus = e.currentTarget.status
      if (responseStatus >= 200 && responseStatus < 300) {
        _this.removeFileFromFormValues(fileToRemove)
      } else {
        handleRequestFailure()
      }
    }

    function handleRequestFailure() {
      _this.updateFileInFormValues(fileToRemove, 'status', 'UPLOADED')
      _this.setState(addErrors({ ...fileToRemove, action: 'REMOVE' }))
    }
  }

  removeFileFromFormValues = (fileToRemove) => {
    const field = this.props.input
    const target = field.value
    const targetProp = this.props.targetProp

    if (targetProp) {
      field.onChange({
        ...target,
        [targetProp]: target[targetProp].filter(file => file.name !== fileToRemove.name)
      })
    } else {
      field.onChange(target.filter(file => file.name !== fileToRemove.name))
    }
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
    const { input, targetProp, disabled, showPreview } = this.props
    const files = targetProp ? input.value[targetProp] || [] : input.value

    return (
      <Fragment>
        <div className="dropzone-file-select truncate-text">
          <button
            className="dropzone-open-file-dialog-btn btn btn-outline-primary"
            type="button"
            onClick={() => this.openFileDialog()}
          >
            {l10n('label.select', 'Valitse')}
          </button>
          <span style={{ cursor: 'default' }}>
            {' '}
            {l10n('label.orDropFileHere', 'tai pudota tiedosto tähän')}
          </span>
        </div>
        {files.length > 0 &&
          <Files
            files={files}
            disabled={disabled}
            showPreview={showPreview}
            removeFile={this.removeFile}
          />
        }
        {this.state.uploading && this.state.activeFile &&
          <QueuedFiles
            activeFile={this.state.activeFile}
            showPreview={showPreview}
            pendingFiles={this.state.queue}
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
      disabled,
    } = this.props

    if (this.state.fetching) {
      return <div>Ladataan...</div>
    }

    return (
      <div>
        {this.renderLabel()}
        <Dropzone
          className={className}
          accept={acceptedFileFormats}
          disabled={error || warning || disabled}
          disableClick={true}
          multiple={true || false}
          style={error || warning || disabled ? { opacity: "0.4" } : null}
          onDrop={this.handleDrop}
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
  className: 'dropzone',
  disabled: false,
  includeCredentials: true,
  includeErrorIcon: false,
  includeFileRestrictionsLegend: false,
  maxFileSize: undefined,
  showPreview: true,
}

RFDropzone.propTypes = {
  input: object.isRequired,
  meta: object.isRequired,
  uploadUrl: string.isRequired,
  acceptedFileFormats: string,
  className: string,
  disabled: bool,
  getFilesOnMount: func,
  includeCredentials: bool,
  includeErrorIcon: bool,
  includeFileRestrictionsLegend: bool,
  label: oneOfType([func, string]),
  maxFileSize: number,
  onFileReadSuccess: func,
  serverSideThreshold: number,
  showPreview: bool,
  targetProp: string,
  // style: PropTypes.object,
  // uploadFn: PropTypes.func.isRequired
}

export default RFDropzone
