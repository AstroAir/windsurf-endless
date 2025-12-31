import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

import { mockVsCodeApi } from './setup';

describe('app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main title', () => {
    render(<App />);
    expect(screen.getByText('VSCode Extension Starter')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<App />);
    expect(screen.getByText('React + shadcn/ui + Tailwind CSS')).toBeInTheDocument();
  });

  it('renders message card', () => {
    render(<App />);
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Send a message to the VSCode extension')).toBeInTheDocument();
  });

  it('renders state management card', () => {
    render(<App />);
    expect(screen.getByText('State Management')).toBeInTheDocument();
    expect(screen.getByText('Persist state across webview sessions')).toBeInTheDocument();
  });

  it('updates message input value', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Enter message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    expect(input).toHaveValue('Hello');
  });

  it('shows message preview when message is entered', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Enter message...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    expect(screen.getByText('Preview: Test message')).toBeInTheDocument();
  });

  it('sends message to VSCode when button is clicked', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Enter message...');
    fireEvent.change(input, { target: { value: 'Hello World' } });

    const sendButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(sendButton);

    expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith({
      type: 'hello',
      data: '💬: Hello World',
    });
  });

  it('sends empty message placeholder when message is empty', () => {
    render(<App />);
    const sendButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(sendButton);

    expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith({
      type: 'hello',
      data: '💬: Empty',
    });
  });

  it('updates state input value', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Enter state...');
    fireEvent.change(input, { target: { value: 'my-state' } });
    expect(input).toHaveValue('my-state');
  });

  it('saves state when Save State button is clicked', () => {
    render(<App />);
    const input = screen.getByPlaceholderText('Enter state...');
    fireEvent.change(input, { target: { value: 'saved-state' } });

    const saveButton = screen.getByRole('button', { name: /save state/i });
    fireEvent.click(saveButton);

    expect(mockVsCodeApi.setState).toHaveBeenCalledWith('saved-state');
  });

  it('loads state when Load State button is clicked', () => {
    mockVsCodeApi.getState.mockReturnValue('loaded-state' as any);
    render(<App />);

    const loadButton = screen.getByRole('button', { name: /load state/i });
    fireEvent.click(loadButton);

    const input = screen.getByPlaceholderText('Enter state...');
    expect(input).toHaveValue('loaded-state');
  });
});
