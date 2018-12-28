import React, { PureComponent } from 'react'
import { array, bool, object } from 'prop-types'
import File from './File'

import Transition from 'react-transition-group/Transition'

// import ReactCSSTransitionGroup from 'react-addons-css-transition-group'

class QueuedFiles extends PureComponent {
  render() {
    return (
      <div>
      <Transition in={true} timeout={0} appear>
        {(status) => (
        <ul className={`dropzone-files dropzone-files-${status}`}>
          {this.props.activeFile &&

            <File
              file={this.props.activeFile}
              showPreview={this.props.showPreview}
            />
          }
          {this.props.pendingFiles.map(file => (
            <File
              key={file.name}
              file={file}
              showPreview={this.props.showPreview}
            />
          ))}
        </ul>


          )}
        </Transition>

      </div>
    )
  }
}

QueuedFiles.propTypes = {
  activeFile: object.isRequired,
  pendingFiles: array.isRequired,
  showPreview: bool.isRequired,
}

export default QueuedFiles
