import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
// import { Button } from 'reactstrap';
// import AlertBlock from './AlertBlock';
import Dropzone from 'react-dropzone'
// import Loading from './Loading';
import l10n from 'get-l10n'
// import attachmentService from '../../state/services/attachment.service';
// import clone from 'clone';

// import cn from 'classnames';

import Files from './Files'
import QueuedFiles from './QueuedFiles'

import UploadErrors from './UploadErrors';

let i = 0;

class RFDropzoneDeferred extends React.Component {
  constructor() {
    super();
    this.state = {
      validationError: '',
      queue: [],
      failedUploads: [],
      uploading: false
    };
    this.dropzoneRef = React.createRef();
  }

  toggleUploadingStatus = () => {
    this.setState({ uploading: !this.state.uploading })
  }

  validateFile = (file) => {
    const { acceptedFileFormats, attachToProp, input, maxFileSize } = this.props;

    if (!file || acceptedFileFormats && acceptedFileFormats.indexOf(file.type) === -1) {
      const error = l10n('error.wrongFileType', 'Tiedosto on väärän tyyppinen.');
      // this.setValidationError(error);
      // return false;
      return error;
    }

    if (maxFileSize && file.size > maxFileSize) {
      const error = l10n('error.fileIsTooLarge', 'Tiedosto on liian suuri.');
      // this.setValidationError(error);
      // return false;
      return error;
    }

    if (attachToProp) {
      const files = input.value[attachToProp];
      const sanitizedFilename = attachmentService.sanitizeFilename(file.name);

      if (files.some(existingFile => existingFile.name === sanitizedFilename)) {
        const error = l10n('error.nameAlreadyInUse', 'Tiedostonimi on jo käytössä.');
        // this.setValidationError(error);
        // return false;
        return error;
      }
    }

    // this.resetValidationError();
    // return true;
  }

  handleDrop = (files) => {
    this.toggleUploadingStatus();
    const prepareFilesForStorage = files.map(file => this.prepareFileForStorage(file))
    return Promise.all(prepareFilesForStorage)
      .then(this.addFilesToQueue)
  }

  addFilesToQueue = (files) => {
    this.setState({ queue: this.state.queue.concat(files) }, () => {
      console.log('added files to queue', this.state.queue);
      this.processNextFileInQueue();
    });
  }

  takeFirstFileFromQueue = () => {
    const queue = this.state.queue
    return new Promise(resolve => {
      this.setState({ activeFile: queue[0], queue: queue.slice(1) }, () => {
        resolve(queue[0])
      })
    })

    // return this.state.queue.find(queuedItem => queuedItem.status === 'PENDING');
  }

  // getFilePositionInQueue = (fileToFind) => {
  //   const queue = this.state.queue;
  //   return queue.findIndex(queuedItem => queuedItem === fileToFind.name);
  // }

  emptyQueue = (cb) => {
    this.setState({ queue: [] }, cb);
  }

  addActiveFileToFailedUploads = (file) => {
    this.setState({
      activeFile: null,
      failedUploads: this.state.failedUploads.concat([this.state.activeFile])
    });
  }

  processNextFileInQueue = () => {
    if (this.queueIsProcessed()) {
      console.log('Queue is empty - updating form values');
      this.emptyQueue(this.updateFormValues(this.state.queue))
      return this.toggleUploadingStatus()
    }


    this.takeFirstFileFromQueue()
      .then(file => {
        // const position = this.getFilePositionInQueue(file)
        const fileError = this.validateFile(file)

        console.log(`processing ${file.name}: `, file);

        // jos virheitä -> poistetaan questa ja siirrettään failedUploads
        if (fileError) {
          console.log('file was invalid');
          const invalidFile = {
            ...item,
            status: 'DECLINED',
            error: fileError
          };
          this.removeFromQueue(position);
          this.addToFailedUploads(invalidFile);
        } else {
          console.log('file was valid - uploading')
          return this.upload(file, false /*(i === 1 ? true : false)*/)
            .then(this.processNextFileInQueue)
            // .then(this.processNextFileInQueue)
        }
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

  upload = (file, fails = false) => {
    i++;
    this.updateActiveFile('status', 'UPLOADING');

    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      let requestCompletedBeforeFirstProgressEvent = false;
      let requestProgressEventsFired = 0;
      console.log('UNSENT', request.status);

      console.log('OPENED', request.status);

      request.upload.addEventListener("loadstart", () => {
        console.log('load start')
      }, false);

      request.upload.addEventListener("progress", (e) => {
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

      request.addEventListener('load', (e) => {
        const responseStatus = e.currentTarget.status;
        console.log('REQUEST COMPLETED!', responseStatus);

        if (responseStatus >= 200 && responseStatus < 300) {
          console.log('request SUCCEEDED!');
          this.completeServerSideThreshold()
            .then(() => resolve({ ...file, status: 'UPLOADED', location: '#' }))
        } else {
          console.log('response FAILED!');
          reject({ ...file, status: 'DECLINED', error: 'Lataaminen ei onnistunut.' })
        }
      })

      console.log('opening request');

      request.open('POST', 'http://localhost:3000/upload-base-64', true)
      request.setRequestHeader("Content-Type", "application/json;charset=UTF-8")
      request.send(JSON.stringify(file))
    })
      .then((file) => {
        console.log('@upload success')
        this.resetActiveFile()
        this.updateFormValues([file])
      })
      // .then(() => this.updateFileInQueue({ ...file, status: 'UPLOADED' }))
      // .then(this.updateFormValues)
      // .then(() => this.removeFileFromQueue(this.getFilePositionInQueue(file)))
      .catch((error) => {
        console.error('upload failed: ', error)
        // this.updateFileInQueue({ ...file, status: 'DECLINED', error })
        this.removeFileFromQueue()
        this.addActiveFileToFailedUploads(file)
        // this.updateFormValues()
        return;
      })












    // this.toggleUploadingStatus();
    // this.props.uploadFn(file, this.props.requestArgs)
    // return new Promise((resolve, reject) => setTimeout(() => {
    //   if (fails) {
    //     console.log('rejecting');
    //     reject(this.updateQueue({ ...item, status: 'DECLINED', error: 'Tiedosto on liian iso.' }))
    //     this.processNextFileInQueue();
    //   } else {
    //     resolve(file)
    //   }
    //
    // }, 3000))
    //   .then(() => this.removeFileFromQueue())
    //   .then(() => {
    //     console.log('@upload success');
    //     this.updateFormValues([{ ...file, status: 'UPLOADED', location: '#' }])
    //   })
    //   // .then(() => this.updateFileInQueue({ ...file, status: 'UPLOADED' }))
    //   // .then(this.updateFormValues)
    //   // .then(() => this.removeFileFromQueue(this.getFilePositionInQueue(file)))
    //   .catch((error) => {
    //     // this.updateFileInQueue({ ...file, status: 'DECLINED', error })
    //     this.removeFileFromQueue()
    //     this.updateFormValues()
    //     return;
    //   })
      // .finally(this.toggleUploadingStatus);<

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
           this.state.queue.every(queuedFile => queuedFile.status !== 'PENDING' && queuedFile.status !== 'UPLOADING');
  }

  resetActiveFile = () => {
    this.setState({ activeFile: null })
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

    URL.revokeObjectURL(fileToRemove.preview);
  }

  updateFormValues = (processedFiles) => {
    console.log('@updateFormValues', processedFiles)
    const field = this.props.input
    const target = field.value
    const targetCopy = JSON.parse(JSON.stringify(target))
    const targetProp = this.props.targetProp


    processedFiles.forEach(processedFile => {
      // const urlObj = new URL(file.preview);
      // console.log('urlObj: ', urlObj);
      // const previewUrl = urlObj.createObjectURL(urlObj)
      // console.log('previewUrl: ', previewUrl);
      // const storableFile = this.prepareFileForStorage(file)

      if (targetProp) {
        targetCopy[targetProp].push(processedFile)
        // const targetWithNewFile = {
        //   ...target,
        //   [targetProp]: target[targetProp].concat([file])
        // };
      } else {
        targetCopy.push(processedFile)
      }
    })

    field.onChange(targetCopy)
  }

  prepareFileForStorage = (file) => {
    const fileReader = new FileReader();

    return new Promise(resolve => {
      fileReader.onload = (event) => {
        const base64EncodedContent = event.target.result.split(',')[1];
        resolve({
          name: /*createFilename(file, filenameOverride), */ file.name,
          type: file.type,
          preview: file.preview,
          content: base64EncodedContent,
          status: 'PENDING'
        });
      };

      fileReader.readAsDataURL(file);
    });
  }

  createFileRows = () => {
    const files = this.props.input.value[this.props.targetProp];
    return (
      <Fragment>
        <Files files={files} removeFile={this.removeFile} />
        {this.state.uploading && this.state.activeFile &&
          <QueuedFiles activeFile={this.state.activeFile} pendingFiles={this.state.queue} />
        }
      </Fragment>
    )
  }

  openFileDialog = () => {
    this.dropzoneRef.current.open()
  }

  uploadNew = () => {
    const request = new XMLHttpRequest();
    let requestCompletedBeforeFirstProgressEvent = false;
    let requestProgressEventsFired = 0;
    console.log('UNSENT', request.status);

    console.log('OPENED', request.status);

    request.upload.addEventListener("loadstart", () => {
      console.log('load start');
    }, false);

    // request.upload.onnprogress = function (e) {
    //   console.log('@onnprogress');
    //   console.log('UPLOADING - completed: ' + (e.loaded / e.total * 100) + '%');
    // };

    // request.load = function () {
    //   console.log('DONE', request.status);)
    //   resolve();
    // };

    request.upload.addEventListener("progress", (e) => {
      if (e.loaded === e.total && requestProgressEventsFired === 0) {
        console.log('completed before first progress event');

      }
      console.log('progress', e);
    }, false);
    request.upload.addEventListener("load", () => {
      console.log('completed');
      resolve();
    }, false);

    // request.onreadystatechange = function() { // Call a function when the state changes.
    //   console.log('onreadystatechange');
    //   resolve()
    //   if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
    //       // Request finished. Do processing here.
    //   }
    // }

    request.open('POST', 'http://localhost:8080/upload-base-64', true);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    request.send(JSON.stringify(body));
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
        {!includeAllowedExtensionsLegend &&
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

export default RFDropzoneDeferred;
