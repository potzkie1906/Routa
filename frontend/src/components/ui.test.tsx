import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BarChart from './admin/BarChart'
import DataTable from './admin/DataTable'
import Pagination from './admin/Pagination'
import ErrorMessage from './ErrorMessage'
import FormField from './FormField'
import StatusBadge from './StatusBadge'

describe('StatusBadge', () => {
  it('shows a readable label for each status', () => {
    render(<StatusBadge status="SUSPENDED" />)
    expect(screen.getByText('Suspended')).toBeTruthy()
  })
})

describe('ErrorMessage', () => {
  it('shows the message and calls onRetry when "Try again" is clicked', () => {
    const onRetry = vi.fn()
    render(<ErrorMessage message="Cannot reach the server." onRetry={onRetry} />)
    expect(screen.getByRole('alert').textContent).toContain('Cannot reach the server.')
    fireEvent.click(screen.getByText('Try again'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
  it('has no retry button when none is given', () => {
    render(<ErrorMessage message="Oops" />)
    expect(screen.queryByText('Try again')).toBeNull()
  })
})

describe('FormField', () => {
  it('connects the label to the input and reports typing', () => {
    const onChange = vi.fn()
    render(<FormField id="email" label="Email" value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.co' } })
    expect(onChange).toHaveBeenCalledWith('a@b.co')
  })
  it('shows the error under the input', () => {
    render(<FormField id="email" label="Email" value="" onChange={() => {}} error="Email cannot be empty" />)
    expect(screen.getByText('Email cannot be empty')).toBeTruthy()
  })
  it('shows and hides a password', () => {
    render(<FormField id="password" label="Password" type="password" value="secret123" onChange={() => {}} />)
    const input = screen.getByLabelText('Password') as HTMLInputElement
    expect(input.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input.type).toBe('password')
  })
})

describe('DataTable', () => {
  const columns = [{ header: 'Name', cell: (row: { id: number; name: string }) => row.name }]

  it('shows one row per item', () => {
    render(<DataTable columns={columns} rows={[{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }]} rowKey={(row) => row.id} emptyMessage="Nothing" />)
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByText('Beta')).toBeTruthy()
  })
  it('shows the empty message when there are no rows', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(row) => row.id} emptyMessage="No routes found." />)
    expect(screen.getByText('No routes found.')).toBeTruthy()
  })
})

describe('Pagination', () => {
  it('disables Previous on the first page and asks for the next page', () => {
    const onPageChange = vi.fn()
    render(<Pagination page={0} totalPages={3} totalItems={25} onPageChange={onPageChange} />)
    expect((screen.getByText('Previous') as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByText('Next'))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })
  it('disables Next on the last page', () => {
    render(<Pagination page={2} totalPages={3} totalItems={25} onPageChange={() => {}} />)
    expect((screen.getByText('Next') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Page 3 of 3')).toBeTruthy()
  })
})

describe('BarChart', () => {
  it('shows every label with its value', () => {
    render(
      <BarChart
        title="Routes"
        data={[
          { label: 'Active routes', value: 6, color: '#16a34a' },
          { label: 'Not active', value: 2, color: '#94a3b8' },
        ]}
      />,
    )
    expect(screen.getByText('Active routes')).toBeTruthy()
    expect(screen.getByText('6')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
  })
})
