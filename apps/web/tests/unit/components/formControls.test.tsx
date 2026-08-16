import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Input,
  PasswordInput,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Switch,
  FormField
} from '../../../components/ui';

describe('UI Primitives: Form Controls & Inputs', () => {
  it('1. Renders FormField with label, helperText, and input binding', () => {
    render(
      <FormField label="Store Name" htmlFor="store-input" helperText="Enter official registration">
        <Input id="store-input" placeholder="VC Flagship" />
      </FormField>
    );

    expect(screen.getByText(/store name/i)).toBeInTheDocument();
    expect(screen.getByText('Enter official registration')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('VC Flagship')).toBeInTheDocument();
  });

  it('2. FormField displays FieldError when error is present', () => {
    render(
      <FormField label="GSTIN Code" error="Invalid GSTIN format">
        <Input placeholder="27AAACG0000A1Z5" />
      </FormField>
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Invalid GSTIN format');
  });

  it('3. PasswordInput toggles visibility state on button click', () => {
    render(<PasswordInput placeholder="Secret key" />);
    const input = screen.getByPlaceholderText('Secret key') as HTMLInputElement;
    const toggleBtn = screen.getByLabelText(/show password/i);

    expect(input.type).toBe('password');
    fireEvent.click(toggleBtn);
    expect(input.type).toBe('text');
    expect(screen.getByLabelText(/hide password/i)).toBeInTheDocument();
  });

  it('4. Select, Checkbox, Radio, and Switch render and handle changes', () => {
    const handleSelect = jest.fn();
    const handleCheck = jest.fn();
    const handleSwitch = jest.fn();

    render(
      <div>
        <Select
          placeholder="Choose option"
          options={[{ value: 'val1', label: 'Option 1' }]}
          onChange={handleSelect}
        />
        <Checkbox label="Terms Accepted" onChange={handleCheck} />
        <Radio name="test-radio" label="Option A" />
        <Switch label="Active Toggle" onChange={handleSwitch} />
        <Textarea placeholder="Notes" />
      </div>
    );

    expect(screen.getByText('Terms Accepted')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Active Toggle')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Notes')).toBeInTheDocument();
  });
});
