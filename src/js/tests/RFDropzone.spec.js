import React from 'react'
import { shallow, mount, render } from 'enzyme'
import RFDropzone from '../components/RFDropzone'

describe('RFDropzone', () => {
  it('should render dropzone', () => {
    const wrapper = shallow(
      <RFDropzone
        input={{ value: [] }}
        meta={{ error: null, warning: null }}
      />
    )
    console.log(wrapper.text())
  })
})
