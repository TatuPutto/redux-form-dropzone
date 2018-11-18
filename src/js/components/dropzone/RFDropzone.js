import React, { Component, Fragment } from 'react'
import { bool, func, object, string } from 'prop-types'
import Dropzone from 'react-dropzone'
import Errors from './Errors'
import Files from './Files'
import QueuedFiles from './QueuedFiles'
import createFilename from '../../util/create-filename'
import l10n from '../../util/l10n'
import validate from '../../util/validate'

import {
  addErrors,
  addFilesToQueue,
  resetActiveFile,
  resetFailedUploads,
  setFirstQueuedFileAsActive,
  toggleFetchingStatus,
  toggleUploadingStatus,
  updateActiveFile
} from '../../util/state-changes'

class RFDropzone extends Component {
  constructor(props) {
    super(props)
    this.state = {
      fetching: props.getFiles ? true : false,
      uploading: false,
      queue: [],
      erroredFiles: [],
    }
    this.dropzoneRef = React.createRef()
    this.progressBarAutocompleteInterval
  }

  componentDidMount() {
    if (this.props.getFiles) {
      this.getFiles()
    }
  }

  getFiles = () => {
    this.props.getFiles()
      .then(files => {
        console.log(files)
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
      this.prepareFiles(validFiles).then((preparedFiles) => {
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
    const filePreparationPromises = files.map((file, i) => this.prepareFile(file, i))
    return Promise.all(filePreparationPromises)
  }

  prepareFile = (file, fileNumber) => {
    const fileReader = new FileReader()
    return new Promise(resolve => {
      fileReader.onload = (event) => {
        if (this.props.onLoadSuccess) {
          this.props.onLoadSuccess(event, file, fileNumber, resolve)
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
      request.withCredentials = this.props.noCredentials ? false : true
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

          // Leave little room for server side processes
          if (progressPercentage >= 80) {
            _this.setState(updateActiveFile('progress', 80))
          } else {
            _this.setState(updateActiveFile('progress', progressPercentage))
          }
        }
      }

      function handleUploadCompletion() {
        if (completedBeforeFirstProgressEvent) {
          _this.completeIndicatorGracefully()
        }
      }

      function handleRequestCompletion(e) {
        const responseStatus = e.currentTarget.status
        if (responseStatus >= 200 && responseStatus < 300) {
          _this.completeServerSideThreshold()
            .then(() => _this.props.onSuccess(file) || Promise.resolve())
            .then(location => resolve({ ...file, status: 'UPLOADED', location }))
        } else {
          clearInterval(_this.uploadInterval)
          reject({ ...file, status: 'DECLINED' })
        }
      }
    })
  }

  handleUploadFailure = (file) => {
    this.setState(resetActiveFile)
    this.setState(addErrors([file]))
  }

  completeIndicatorGracefully = () => {
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

  completeServerSideThreshold = () => {
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

    if (targetProp) {
      targetCopy[targetProp] ?
        targetCopy[targetProp].concat(files) :
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
    request.open('DELETE', `${this.props.uploadUrl}/${fileToRemove.name}`, true)
    request.withCredentials = this.props.noCredentials ? false : true
    request.send()

    function handleRequestCompletion(e) {
      const responseStatus = e.currentTarget.status
      if (responseStatus >= 200 && responseStatus < 300) {
        _this.removeFileFromFormValues(fileToRemove)
      } else {
        _this.updateFileInFormValues(fileToRemove, 'status', 'UPLOADED')
        _this.setState(addErrors({ ...fileToRemove, action: 'REMOVE' }))
      }
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

  renderDropzoneContent = () => {
    const { input, targetProp } = this.props
    const files = targetProp ? input.value[targetProp] || [] : input.value

    return (
      <Fragment>
        <div className="dropzone-file-select truncate-text">
          <button
            className="dropzone-open-file-dialog-btn btn btn-outline-primary"
            type="button"
            onClick={() => this.openFileDialog()}
          >
            Valitse
          </button>
          <span style={{ cursor: 'default' }}>
            {' '}
            tai pudota tiedosto tähän
          </span>
        </div>
        {files.length > 0 &&
          <Files files={files} removeFile={this.removeFile} />
        }
        {this.state.uploading && this.state.activeFile &&
          <QueuedFiles activeFile={this.state.activeFile} pendingFiles={this.state.queue} />
        }
      </Fragment>
    )
  }

  renderFileRestrictions = () => {
    const { includeAllowedExtensionsLegend, maxFileSize } = this.props
    if (includeAllowedExtensionsLegend && maxFileSize) {
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
      acceptedFileFormats = "image/jpeg, image/png, application/pdf",
      // className = "dropzone",
      disabled = false,
      includeAllowedExtensionsLegend = false,
      includeErrorIcon = false,
      input,
      label,
      maxFileSize,
      meta: { error, warning },
      // style = { width: "18rem" }
    } = this.props;

    if (this.state.fetching) {
      return <div>Ladataan...</div>
    }

    return (
      <div>
        {label &&
          <label className="upper-label">
            {(includeErrorIcon && (error || warning)) &&
              <span className="fas fa-asterisk text-warning" />
            }
            {label}
          </label>
        }
        <Dropzone
          className="dropzone"
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

RFDropzone.propTypes = {



  // acceptedFileFormats: PropTypes.string,
  // className: PropTypes.string,
  // disabled: PropTypes.bool,
  // includeAllowedExtensionsLegend: PropTypes.bool,
  // includeErrorIcon: PropTypes.bool,
  // input: PropTypes.object.isRequired,
  // label: PropTypes.string,
  // meta: PropTypes.object,
  // style: PropTypes.object,
  // uploadFn: PropTypes.func.isRequired
};

export default RFDropzone
