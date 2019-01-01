import React from 'react'
import { shallow, mount } from 'enzyme'
import RFDropzone from '../components/RFDropzone'
import FailedToLoad from '../components/FailedToLoad'
import FileSelection from '../components/FileSelection'
import Files from '../components/Files'
import LoadingFiles from '../components/LoadingFiles'
import QueuedFiles from '../components/QueuedFiles'

describe('RFDropzone', () => {
  let props
  let state
  // let shallowDropzone
  // let mountedDropzone

  const shallowDropzone = () => {
    return shallow(<RFDropzone {...props} />)
    if (!shallowDropzone) {
      // shallowDropzone = shallow(<RFDropzone {...props} />)
    }
    return shallowDropzone
  }

  const mountDropzone = () => {
    return mount(<RFDropzone {...props} />)
    // if (!mountedDropzone) {
    //   mountedDropzone = mount(<RFDropzone {...props} />)
    // }
    // return mountedDropzone
  }

  beforeEach(() => {
    props = {
      input: { value: [] },
      meta: { error: null, warning: null },
      name: 'users[0]',
      uploadUrl: ''
    }
  })

  describe('get files on mount cycle', () => {

    it('should set `state.fetching` initially to true if `props.getFilesOnMount` has been provided', () => {
      props = { ...props, getFilesOnMount: () => Promise.resolve() }
      const dropzone = shallowDropzone()
      expect(dropzone.state().fetching).toBe(true)
    })

    it('should render only `LoadingFiles` when loading files', () => {
      props = { ...props, getFilesOnMount: () => Promise.resolve() }
      const dropzone = shallowDropzone()
      expect(dropzone.find(LoadingFiles).length).toBe(1)
      expect(dropzone.find(FailedToLoad).length).toBe(0)
      expect(dropzone.find(FileSelection).length).toBe(0)
      expect(dropzone.find(Files).length).toBe(0)
      expect(dropzone.find(QueuedFiles).length).toBe(0)
    })

    it('should render only `FailedToLoad` when load fails', async () => {
      props = { ...props, getFilesOnMount: () => Promise.reject() }
      const dropzone = shallowDropzone()
      await dropzone.instance().componentDidMount()
      dropzone.update()
      expect(dropzone.find(FailedToLoad).length).toBe(1)
      expect(dropzone.find(LoadingFiles).length).toBe(0)
      expect(dropzone.find(FileSelection).length).toBe(0)
      expect(dropzone.find(Files).length).toBe(0)
      expect(dropzone.find(QueuedFiles).length).toBe(0)
    })

  })

  it('should render `FileSelection` when not loading files', () => {
    const dropzone = shallowDropzone()
    expect(dropzone.find(FileSelection).length).toBe(1)
  })
})
