import React from 'react'
import {render, fireEvent, act} from '@testing-library/react'
import faker from 'faker'
import {buildListItem} from '../../../test/generate'
import {
  updateListItem,
  __mockListItemDispatch,
} from '../../context/list-item-context'
import Rating from '../rating'

jest.mock('../../context/list-item-context', () => {
  const __mockListItemDispatch = () => {}
  return {
    __mockListItemDispatch,
    useListItemDispatch: () => __mockListItemDispatch,
    updateListItem: jest.fn(() => {
      throw new Error('updateListItem needs to be mocked')
    }),
  }
})

beforeEach(() => {
  updateListItem.mockClear()
})

test('clicking a star calls updateListItem', async () => {
  const fakeResponse = Promise.resolve()
  updateListItem.mockReturnValueOnce(fakeResponse)
  const listItem = buildListItem({rating: 0})
  const {getByLabelText} = render(<Rating listItem={listItem} />)
  const oneStar = getByLabelText(/1 star/i)

  // using fake timers to skip debounce time
  jest.useFakeTimers()
  fireEvent.click(oneStar)
  expect(oneStar.checked).toBe(true)
  act(() => jest.runAllTimers())
  jest.useRealTimers()

  expect(updateListItem).toHaveBeenCalledTimes(1)
  expect(updateListItem).toHaveBeenCalledWith(
    __mockListItemDispatch,
    listItem.id,
    {rating: 1},
  )
  await act(() => fakeResponse)
})

test('an error updating the rating shows the error message', async () => {
  const listItem = buildListItem({rating: 0})
  const {getByLabelText, findByText} = render(<Rating listItem={listItem} />)
  const oneStar = getByLabelText(/1 star/i)

  const errorMessage = faker.lorem.words()
  updateListItem.mockRejectedValueOnce({status: 500, message: errorMessage})

  // using fake timers to skip debounce time
  jest.useFakeTimers()
  fireEvent.click(oneStar)
  expect(oneStar.checked).toBe(true)
  act(() => jest.runAllTimers())
  jest.useRealTimers()
  const messageNode = await findByText(errorMessage)
  expect(messageNode).toBeInTheDocument()
})
