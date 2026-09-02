import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AuthPage from "./AuthPage";

function setup(overrides = {}) {
  const props = {
    authMode: "register",
    setAuthMode: vi.fn(),
    authForm: { name: "Alex", email: "a@b.com", password: "123456" },
    setAuthForm: vi.fn(),
    authError: "",
    setAuthError: vi.fn(),
    authLoading: false,
    handleLogin: vi.fn((e) => e && e.preventDefault && e.preventDefault()),
    handleRegister: vi.fn((e) => e && e.preventDefault && e.preventDefault()),
    onBackHome: vi.fn(),
    onGuestDemo: vi.fn(),
    ...overrides,
  };
  const utils = render(<AuthPage {...props} />);
  return { props, utils };
}

describe("AuthPage password validation", () => {
  it("shows the minimum-length hint only in register mode", () => {
    const { utils } = setup({ authMode: "register" });
    expect(screen.getByText("Minimum 6 characters")).toBeInTheDocument();
    utils.rerender(
      <AuthPage
        authMode="login"
        setAuthMode={vi.fn()}
        authForm={{ name: "", email: "a@b.com", password: "123456" }}
        setAuthForm={vi.fn()}
        authError=""
        setAuthError={vi.fn()}
        authLoading={false}
        handleLogin={vi.fn()}
        handleRegister={vi.fn()}
        onBackHome={vi.fn()}
        onGuestDemo={vi.fn()}
      />,
    );
    expect(screen.queryByText("Minimum 6 characters")).not.toBeInTheDocument();
  });

  it("blocks registration with a short password and sets an error", () => {
    const { props, utils } = setup({
      authMode: "register",
      authForm: { name: "Alex", email: "a@b.com", password: "123" },
    });
    fireEvent.submit(utils.container.querySelector("form"));
    expect(props.setAuthError).toHaveBeenCalledWith(
      expect.stringContaining("at least 6"),
    );
    expect(props.handleRegister).not.toHaveBeenCalled();
  });

  it("allows registration when the password is long enough", () => {
    const { props, utils } = setup({
      authMode: "register",
      authForm: { name: "Alex", email: "a@b.com", password: "123456" },
    });
    fireEvent.submit(utils.container.querySelector("form"));
    expect(props.handleRegister).toHaveBeenCalledTimes(1);
  });

  it("routes submit to handleLogin in login mode without the length check", () => {
    const { props, utils } = setup({
      authMode: "login",
      authForm: { name: "", email: "a@b.com", password: "123" },
    });
    fireEvent.submit(utils.container.querySelector("form"));
    expect(props.handleLogin).toHaveBeenCalledTimes(1);
    expect(props.setAuthError).not.toHaveBeenCalled();
  });
});
