import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
// import { Button } from 'reactstrap';
// import AlertBlock from './AlertBlock';
import Dropzone from 'react-dropzone'
// import Loading from './Loading';
import l10n from '../../util/l10n'
// import attachmentService from '../../state/services/attachment.service';
// import clone from 'clone';

// import cn from 'classnames';
import createFilename from '../../util/create-filename'
import validate from '../../util/validate'

import Files from './Files'
import QueuedFiles from './QueuedFiles'

import UploadErrors from './UploadErrors'

import {
  addFilesToFailedUploads,
  addFilesToQueue,
  resetFailedUploads
} from '../../util/state-changes'

class RFDropzone extends React.Component {
  constructor() {
    super();
    this.state = {
      validationError: '',
      queue: [],
      failedUploads: [],
      uploading: false
    };
    this.amountOfFilesToProcess = 0;
    this.dropzoneRef = React.createRef();
  }

  toggleUploadingStatus = () => {
    this.setState({ uploading: !this.state.uploading });
  }

  validateFiles = (files) => {
    const { validFiles, invalidFiles } = validate(files, this.props)

    this.setState(resetFailedUploads)
    this.setState(addFilesToFailedUploads(invalidFiles))

    return validFiles
  }

  // resetFailedUploads = () => {
  //   // return new Promise(resolve => {
  //     // this.setState({ failedUploads: [] }, resolve)
  //   // })
  //   this.setState(resetFailedUploads);
  // }

  // retry = (file) => {
  //   this.toggleUploadingStatus()
  //   this.addFilesToQueue(file)
  // }

  handleDrop = (acceptedFiles, rejectedFiles) => {
    const files = [].concat(acceptedFiles, rejectedFiles)
    const validFiles = this.validateFiles(files, this.props)

    this.amountOfFilesToProcess = validFiles.length;

    this.prepareFiles(validFiles)
      .then(() => this.setState(addFilesToQueue, this.processQueue))


    // this.resetFailedUploads(() => {
    //
    // })

    // const validAndInvalidFiles = this.validateFiles(files)




    // this.toggleUploadingStatus()
    // this.resetFailedUploads()
    //   .then(() => {
    //     const validFiles = this.validateFiles(files)
    //     this.amountOfFilesToProcess = validFiles.length;
    //   })
    //   .then(this.prepareFiles)
    //   .then(this.addFilesToQueue)
      // .then((preparedFiles) => {
      //   console.log('Files prepared successfully', preparedFiles.map((file) => {
      //     return file.name
      //   }));
      // })
      // .then(this.addFilesToQueue)

      // this.prepareFilesForStorage(validFiles)

    //   return Promise.all(prepareFilesForStorage)
    //     .then(this.addFilesToQueue)
    //   // const prepareFilesForStorage = validFiles.map(file => this.prepareFileForStorage(file))
    //   // return Promise.all(prepareFilesForStorage)
    //   //   .then(this.addFilesToQueue)
    // })
  }

  // addFilesToQueue = (files) => {
  //   if (!files.length) return;
  //   this.setState({ queue: this.state.queue.concat(files) }, () => {
  //     console.log('added files to queue', this.state.queue)
  //     this.processQueue()
  //   });
  // }

  processQueue = () => {
    console.log('@processQueue', this.state);
    if (this.queueIsProcessed()) {
      console.log('Queue is empty - updating form values');
      // this.emptyQueue(this.updateFormValues(this.state.queue))
      return this.toggleUploadingStatus()
    } else {
      this.processNextFileInQueue()
    }
  }

  processNextFileInQueue = () => {
    this.takeFirstFileFromQueueAndSetIsAsActive()
      // .then(this.uploadActiveFile)
      .then(this.addFileToFormValues)
      .then(this.resetActiveFile)
      .catch(this.handleProcessingFailure)
      .finally(this.processQueue)
      // .then(this.handleUploadSuccess)
      // .then((file) => {
      //   console.log('@upload success')
      //   this.resetActiveFile()
      //   // this.updateFormValues([file])
      // })
      // .then(() => this.updateFileInQueue({ ...file, status: 'UPLOADED' }))
      // .then(this.updateFormValues)
      // .then(() => this.removeFileFromQueue(this.getFilePositionInQueue(file)))
      // .catch((error) => {
      //   console.error('upload failed: ', error)
      //   // this.updateFileInQueue({ ...file, status: 'DECLINED', error })
      //   // this.removeFileFromQueue()
      //   this.resetActiveFile()
      //   this.addFileToFailedUploads(file)
      //   // this.updateFormValues()
      //   return;
      // })
      // .then(file => {
        // console.log(`processing ${file.name}: `, file);


      //     return this.upload(file, false /*(i === 1 ? true : false)*/)
      //       .then(this.processNextFileInQueue)
      //       // .then(this.processNextFileInQueue)
      //   // }
      // })
  }

  takeFirstFileFromQueueAndSetIsAsActive = () => {
    const queue = this.state.queue
    return new Promise(resolve => {
      this.setState({
        activeFile: queue[0],
        queue: queue.slice(1)
      }, () => {
        resolve(queue[0])
      })
    })

    // return this.state.queue.find(queuedItem => queuedItem.status === 'PENDING');
  }

  uploadActiveFile = (file) => {
    this.updateActiveFile('status', 'UPLOADING');

    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      let requestCompletedBeforeFirstProgressEvent = false;
      let requestProgressEventsFired = 0;

      request.upload.addEventListener('progress', (e) => {
        console.log('onProgress')
        if (requestProgressEventsFired === 0 && e.loaded === e.total) {
          console.log('completed before first progress event')
          requestCompletedBeforeFirstProgressEvent = true
        } else {
          const progressPercentage = e.progress / e.total * 100
          // Leave little room for server side processes
          if (progressPercentage >= 80) {
            this.updateActiveFile('progress', 80)
          } else {
            this.updateActiveFile('progress', progressPercentage)
          }
        }
        console.log('progress', e);
      }, false);
      request.upload.addEventListener("load", () => {
        console.log('completed');
        if (requestCompletedBeforeFirstProgressEvent) {
          this.completeIndicatorGracefully()
        } else {
          // resolve()
        }

        // resolve();
      }, false);

      request.addEventListener('error', (e) => {
        console.log('REQUEST ERRORED OUT!', e);
        resolve({ ...file, status: 'RETRIABLE', error: 'Lataaminen ei onnistunut.' })
      })

      request.addEventListener('load', (e) => {
        const responseStatus = e.currentTarget.status;
        console.log('REQUEST COMPLETED!', responseStatus);

        if (responseStatus >= 200 && responseStatus < 300) {
          console.log('request SUCCEEDED!');
          this.completeServerSideThreshold()
            .then(() => this.props.onSuccess(file) || Promise.resolve())
            .then(location => resolve({ ...file, status: 'UPLOADED', location }))
        } else {
          console.log('response FAILED!');
          reject({ ...file, status: 'DECLINED', error: 'Lataaminen ei onnistunut.' })
        }
      })

      console.log('opening request');

      console.log('file before upload', JSON.stringify(file));

      request.open('POST', this.props.uploadUrl, true)
      request.withCredentials = true;
      request.setRequestHeader('Content-Type', 'application/json')
      request.send(JSON.stringify({
        name: file.name,
        contentType: file.type,
        content: file.content
      }))

    })
  }

  handleUploadSuccess = (file) => {
  //   console.log('@handleUploadSuccess')
  //   this.resetActiveFile()
  //     .then()
  //   // this.updateFormValues([file])
  }

  handleProcessingFailure = (file) => {
    console.log('@handleProcessingFailure');
    return Promise.all([
      this.resetActiveFile(),
      this.addFileToFailedUploads(file)
    ])
  }

  addFileToFailedUploads = (file) => {
    return new Promise(resolve => {
      this.setState({ failedUploads: this.state.failedUploads.concat([file]) }, () => {
        resolve()
      })
    })
  }

  completeIndicatorGracefully = () => {
    let progressPercentage = 0

    return new Promise(resolve => {
      let onUploadProgress = setInterval(() => {
        if (progressPercentage <= 80) {
          this.updateActiveFile('progress', progressPercentage)
          progressPercentage++
        } else {
          clearInterval(onUploadProgress)
          resolve()
        }
      }, 1);
    })
  }

  completeServerSideThreshold = () => {
    const serverSideThreshold = 20;
    let iterations = 0;

    return new Promise(resolve => {
      let onUploadProgress = setInterval(() => {
        if (iterations < 20) {
          this.updateActiveFile('progress', (100 - serverSideThreshold + iterations))
          iterations++
        } else {
          clearInterval(onUploadProgress)
          resolve()
        }
      }, 1);
    })
  }

  emptyQueue = (cb) => {
    this.setState({ queue: [] }, cb);
  }




  removeFileFromQueue = () => {
    let queueCopy = [...this.state.queue];
    // let queueAfterRemoval;
    // console.log('queueCopy.shift()', queueCopy.shift());
    if (queueCopy.length === 1) {
      queueCopy = [];
    } else {
      queueCopy = queueCopy.slice(1);
    }

    console.log('@removeFromQueue: ', queueCopy);

    return new Promise(resolve => {
      this.setState({ queue: queueCopy }, () => {
        console.log('queue after removal', this.state.queue);
        resolve();
        // this.processNextFileInQueue()
        //   .then(() => {
        //     console.log('\n\nQUEUE PROCESSED!\n\n');
        //   })
      });
    })

  }

  queueIsProcessed = () => {
    return !this.state.queue.length ||
           this.state.queue.every(queuedFile => queuedFile.status !== 'PENDING' &&
                                                queuedFile.status !== 'UPLOADING' &&
                                                queuedFile.status !== 'DECLINED');
  }

  resetActiveFile = () => {
    return new Promise(resolve => {
      this.setState({ activeFile: null }, () => {
        resolve()
      })
    })
  }

  updateActiveFile = (key, value) => {
    const activeFile = this.state.activeFile
    // console.log('@updateActiveFile', activeFile);
    const updatedActiveFile = { ...activeFile, [key]: value }
    // console.log('@updateActiveFile', updatedActiveFile);
    this.setState({ activeFile: updatedActiveFile })
    // console.log('@updateQueue', changedFile);
    //
    // this.setState({ queue: this.state.queue.map(queueFile => {
    //   console.log('checking item: ', queueFile);
    //   if (changedFile.name === queueFile.name) {
    //     console.log('replacing with new file', changedFile);
    //     return changedFile;
    //   } else {
    //     console.log('returnign old file', queuedFile);
    //     return queuedFile;
    //   }
    // }) });
  }

  removeFile = (fileToRemove) => {
    const request = new XMLHttpRequest();

    request.addEventListener('error', (e) => {
      console.log('REQUEST ERRORED OUT!', e);
      // resolve({ ...file, status: 'RETRIABLE', error: 'Lataaminen ei onnistunut.' })
    })

    request.addEventListener('load', (e) => {
      const responseStatus = e.currentTarget.status;
      console.log('REQUEST COMPLETED!', responseStatus);

      if (responseStatus >= 200 && responseStatus < 300) {
        console.log('request SUCCEEDED!');
        this.removeFileFromFormValues(fileToRemove)
      } else {
        console.log('response FAILED!');

      }
    })

    console.log('opening removal request');

    request.open('DELETE', `${this.props.uploadUrl}/${fileToRemove.name}`, true)
    request.withCredentials = true
    request.send()

    // URL.revokeObjectURL(fileToRemove.preview);
  }

  removeFileFromFormValues = (fileToRemove) => {
    const field = this.props.input
    const target = field.value
    const targetProp = this.props.targetProp

    if (targetProp) {
      const targetWithFileRemoved = {
        ...target,
        [targetProp]: target[targetProp].filter(file => file.name !== fileToRemove.name)
      };
      field.onChange(targetWithFileRemoved);
    } else {
      field.onChange(file);
    }

    // URL.revokeObjectURL(fileToRemove.preview);
  }

  addFileToFormValues = (processedFile) => {
    console.log('@updateFormValues', processedFile)
    const field = this.props.input
    const target = field.value
    const targetCopy = JSON.parse(JSON.stringify(target))
    const targetProp = this.props.targetProp

    // processedFiles.forEach(processedFile => {
      // const urlObj = new URL(file.preview);
      // console.log('urlObj: ', urlObj);
      // const previewUrl = urlObj.createObjectURL(urlObj)
      // console.log('previewUrl: ', previewUrl);
      // const storableFile = this.prepareFileForStorage(file)

      if (targetProp) {
        targetCopy[targetProp].push(processedFile)
        // targetWithNewFile = {
        //   ...target,
        //   [targetProp]: target[targetProp].concat([file])
        // }
      } else {
        targetCopy.push(processedFile)
      }
    // })
    return field.onChange(targetCopy)
  }

  prepareFiles = (files) => {console.log('@prepareFileForStorage', this.props);
    const filePreparationPromises = files.map((file, i) => this.prepareFile(file, i));
    return Promise.all(filePreparationPromises);
  }

  prepareFile = (file, fileNumber) => {
    const fileReader = new FileReader();
    return new Promise(resolve => {
      fileReader.onload = (event) => {
        if (this.props.onLoadSuccess) {
          this.props.onLoadSuccess(event, file, fileNumber, resolve)
        } else {
          this.createFile(event, file, fileNumber, resolve)
        }
      }
      fileReader.readAsDataURL(file);
    });
  }

  createFile = (event, file, fileNumber, resolve) => {
    const base64EncodedContent = event.target.result.split(',')[1];
    resolve({
      name: createFilename(file, fileNumber, this.props),
      type: file.type,
      preview: file.preview,
      content: base64EncodedContent,
      status: 'PENDING'
    });
  };



  createFileRows = () => {
    const files = this.props.input.value[this.props.targetProp];
    return (
      <Fragment>
        <Files files={files} removeFile={this.removeFile} retry={this.retry} />
        {this.state.uploading && this.state.activeFile &&
          <QueuedFiles activeFile={this.state.activeFile} pendingFiles={this.state.queue} />
        }
      </Fragment>
    )
  }

  openFileDialog = () => {
    this.dropzoneRef.current.open()
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
      meta: { error, warning },
      // style = { width: "18rem" }
    } = this.props;
    const { uploading, validationError } = this.state;
    //accept={acceptedFileFormats}
    // style={style}
    // console.log(this.state);

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
          name={input.name}
          className="dropzone"
          accept={"image/jpeg, image/png, application/pdf"}
          disabled={error || warning || disabled}
          disableClick={true}
          multiple={true || false}
          style={error || warning || disabled ? { opacity: "0.4" } : null}
          onDrop={this.handleDrop}
          ref={this.dropzoneRef}
        >
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
                {/*}{translations["selectOrDropFile"]}*/}
              </span>
            </div>
            {this.createFileRows()}
          </Fragment>
        </Dropzone>
        {includeAllowedExtensionsLegend &&
          <small className="text-muted text-nowrap">
            {l10n(
              'label.attachmentRestrictions',
              `Sallitut muodot: PDF, JPG, PNG. Koko enintään ${2}MB.`,
              ['2']
            )}
          </small>
        }
        {this.state.failedUploads.length > 0 &&
          <UploadErrors failedUploads={this.state.failedUploads} />
        }
        {validationError &&
          <AlertBlock
            alertType="danger"
            icon="exclamation-triangle"
            text={validationError}
            className="mb-0"
          />
        }
      </div>
    );
  }
}

// RFDropzone.propTypes = {
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
// };

export default RFDropzone;
