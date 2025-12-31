import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

import './setup';

describe('app', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main title', () => {
    render(<App />);
    expect(screen.getByText('Windsurf Endless')).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    render(<App />);
    expect(screen.getByText('Infinite Ask - 无限对话扩展')).toBeInTheDocument();
  });

  it('renders MCP status card', () => {
    render(<App />);
    expect(screen.getByText('MCP 服务状态')).toBeInTheDocument();
  });

  it('renders quick stats card', () => {
    render(<App />);
    expect(screen.getByText('快速统计')).toBeInTheDocument();
  });

  it('renders features section', () => {
    render(<App />);
    expect(screen.getByText('功能特性')).toBeInTheDocument();
  });

  it('renders navigation tabs', () => {
    render(<App />);
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('对话')).toBeInTheDocument();
    expect(screen.getByText('历史')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    render(<App />);
    expect(screen.getByText('多对话管理')).toBeInTheDocument();
    expect(screen.getByText('历史记录')).toBeInTheDocument();
    expect(screen.getByText('无限续杯')).toBeInTheDocument();
    expect(screen.getByText('灵活配置')).toBeInTheDocument();
  });

  it('renders version badge', () => {
    render(<App />);
    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
  });
});
