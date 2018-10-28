import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
// import { Button } from 'reactstrap';
// import AlertBlock from './AlertBlock';
import Dropzone from 'react-dropzone';
// import Loading from './Loading';
import l10n from 'get-l10n';
// import attachmentService from '../../state/services/attachment.service';
// import clone from 'clone';

// import cn from 'classnames';


var i = 0;

class RFDropzone extends React.Component {
  constructor() {
    super();
    this.state = {
      uploading: false,
      uploadQueue: [],
      failedUploads: [],
      validationError: ''
    };
  }

  toggleUploadingStatus = () => {
    this.setState({ uploading: !this.state.uploading });
  }

  setValidationError = (error) => {
    this.setState({ validationError: error });
  }

  resetValidationError = () => {
    this.setState({ validationError: '' });
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
    console.log(files);
    this.toggleUploadingStatus();

    const file = files[0];


    const newFiles = this.prepareFiles(files);
    // this.setState({ uploadQueue: this.state.uploadQueue.concat(uploadQueue) }, this.processQueue);
    this.setState({ uploadQueue: this.state.uploadQueue.concat(newFiles) }, () => {
      console.log('added files to queue', this.state.uploadQueue);
      this.processQueue();
    });
  }

  prepareFiles = (files) => {
    return files.map(file => ({
      file: file,
      status: 'PENDING'
    }));
  }

  getFirstPendingItemInQueue = () => {
    return this.state.uploadQueue.find(itemInQueue => itemInQueue.status === 'PENDING');
  }

  getPositionInQueue = (item) => {
    const queue = this.state.uploadQueue;
    return queue.findIndex(queuedItem => queuedItem.file.name === item.file.name);
  }

  removeFromQueue = (position) => {
    const queueCopy = [...this.state.uploadQueue];
    let newQueue;
    // console.log('queueCopy.shift()', queueCopy.shift());
    if (queueCopy.length === 1) {
      newQueue = [];
    } else {
      newQueue = queueCopy.slice(1);
    }

    console.log('@removeFromQueue - newQueue: ', newQueue);

    this.setState({ uploadQueue: newQueue }, () => {
      console.log('state after removal', this.state.uploadQueue);
      this.processQueue();
    });
  }

  addToFailedUploads = (item) => {
    this.setState({ failedUploads: this.state.failedUploads.concat([item]) });
  }

  processQueue = () => {
    if (this.queueIsEmpty()) return this.toggleUploadingStatus();

    const item = this.getFirstPendingItemInQueue();
    const position = this.getPositionInQueue(item);
    const fileError = this.validateFile(item.file);

    console.log('processing item: ', item);

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
      console.log('file was valid - uploading');
      this.upload(item, (i === 1 ? true : false));
    }


    // const queue = this.state.uploadQueue;
    //
    // const processes = queue.map(queuedFile => {
    //   const fileError = this.validateFile(queuedFile);
    //   if (!fileError) {
    //     window.URL.revokeObjectURL(queuedFile.preview);
    //     // this.props.uploadAttachment(file);
    //     // this.props.input.onChange(file.name);
    //     return this.upload(queuedFile);
    //   } else {
    //     const invalidFile = {
    //       ...queuedFile,
    //       status: 'declined',
    //       reasonOfDeclination: fileError
    //     };
    //     this.updateQueue(invalidFile)
    //     return Promise.resolve();
    //   }
    // })

    // return Promise.all(processes)
    //   .then(this.toggleUploadingStatus);

    // if (this.isValidFile(file)) {
    //   window.URL.revokeObjectURL(file.preview);
    //   // this.props.uploadAttachment(file);
    //   // this.props.input.onChange(file.name);
    //   this.upload(file);
    // }
  }



  upload = (item, fails = false) => {
    i++;
    this.updateQueue({ ...item, status: 'UPLOADING' });
    // this.toggleUploadingStatus();
    // this.props.uploadFn(file, this.props.requestArgs)
    return new Promise((resolve, reject) => setTimeout(() => {
      if (fails) {
        console.log('rejecting');
        reject(this.updateQueue({ ...item, status: 'DECLINED', error: 'Tiedosto on liian iso.' }))
        this.processQueue();
      } else {
        resolve(item.file)
      }

    }, 3000))
      .then(this.updateFormValues)
      .then(() => this.removeFromQueue(this.getPositionInQueue(item)))
      .catch((error) => {console.error(error)})
      // .finally(this.toggleUploadingStatus);

  }

  queueIsEmpty = () => {
    const queue = this.state.uploadQueue;
    return !queue.length ||
           queue.every(queuedFile => queuedFile.status === 'DECLINED');
  }

  fileIsValid = (file) => {
    const queue = this.state.uploadQueue;
    // return this.state.uploadQueue[0].name === file.name;
    return queue.find(queuedFile => queuedFile.name === file.name);
  }

  updateQueue = (changedItem) => {
    console.log('@updateQueue', changedItem);

    this.setState({ uploadQueue: this.state.uploadQueue.map(itemInQueue => {
      console.log('checking item: ', itemInQueue);
      if (changedItem.file.name === itemInQueue.file.name) {
        console.log('replacing with new file', changedItem);
        return changedItem;
      } else {
        console.log('returnign old file', itemInQueue);
        return itemInQueue;
      }
    }) });
  }

  updateFormValues = (file) => {
    const field = this.props.input;
    const target = field.value;
    const targetProp = this.props.targetProp;
    // console.log('target: ', target);

    if (targetProp) {
      // console.log('attachments are part of large collection');
      const targetWithNewFile = {
        ...target,
        [targetProp]: target[targetProp].concat([file])
      };
      // console.log('targetWithNewFile', targetWithNewFile);
      field.onChange(targetWithNewFile);
    } else {
      // console.log('target contains file only');
      field.onChange(file);
    }
  }


  createFileRows = () => {
    const files = this.props.input.value[this.props.targetProp];
    const queuedItems = this.state.uploadQueue;
    const failedUploads = this.state.failedUploads;
    console.log('@createFileRows', files);


    return (
      <div>
        <ul>
          {files.map((file, i) => (
            <Fragment>
            <li key={file.name} style={{padding: '0 .5rem'}}>


              <a href={file.location} target="_blank">
                {file.name}
                <span className="fas fa-external-link-alt ml-2" />
              </a>

              <span className="text-danger float-right">
                <span className="fas fa-trash-alt"></span>
              </span>

            </li>
            <hr />
            </Fragment>
          ))}
          {/*<li key={"Tatu_Putto_Turvallisuusselvitys_Puolustusvoimat.pdf"} style={{padding: '0 .5rem'}}>


            <a href={"#"} target="_blank" className="d-block">
              {"Tatu_Putto_Turvallisuusselvitys_Puolustusvoimat.pdf"}
            </a>


            <div id="upload-progress-container">
              <div id="upload-progress" />
            </div>

          </li>*/}

          {/*}<div id="upload-progress-container">
            <div id="upload-progress" />
          </div>*/}

          {queuedItems.map(item => (
            <Fragment>
              <li key={item.file.name} style={{padding: '0 .5rem'}}>
                <div className="truncated">
                  {item.file.name}
                </div>
                {item.status === 'PENDING' ?
                  <small>Odottaa...</small>

                  : item.status === 'UPLOADING' ?
                    <small>
                      <Loading inline />
                      <span className="ml-2">Lähetetään...</span>
                    </small>

                    :
                      <AlertBlock
                        alertType="danger"
                        icon="exclamation-triangle"
                        text={item.error}
                      />
                }

              </li>
              <hr />
            </Fragment>
          ))}

          {failedUploads.map(item => (
            <Fragment>
              <li key={item.file.name} style={{padding: '0 .5rem'}}>
                <div className="truncated">
                  {item.file.name}
                </div>
                <AlertBlock
                  alertType="danger"
                  icon="exclamation-triangle"
                  text={item.error}
                />
              </li>
              <hr />
            </Fragment>
          ))}



        </ul>
        <hr />
      </div>
    );
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

    // style={style}
    console.log(this.state);

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
          accept={acceptedFileFormats}
          disabled={error || warning || disabled}
          disableClick={uploading}
          multiple={true || false}
          style={error || warning || disabled ? { opacity: "0.4" } : null}
          onDrop={this.handleDrop}
          ref={dropzone => (this.dropzone = dropzone)}
        >
          <Fragment>
            {uploading ?
              <div>
                <Loading inline />&nbsp;
                {`${translations["uploading"]}...`}
              </div>
              :
              <div className="truncated">
                <a>
                  Valitse
                </a>
                <span style={{ cursor: 'default' }}>
                  {' '}
                  tai pudota tiedosto tähän
                  {/*}{translations["selectOrDropFile"]}*/}
                </span>
              </div>
            }
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
