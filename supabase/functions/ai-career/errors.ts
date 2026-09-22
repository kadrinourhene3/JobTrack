export class PublicFunctionError extends Error {
  constructor(
    readonly code: string,
    readonly publicMessage: string,
    readonly status: number,
  ) {
    super(publicMessage);
    this.name = "PublicFunctionError";
  }
}

export class RequestValidationError extends PublicFunctionError {
  constructor(message: string) {
    super("INVALID_REQUEST", message, 400);
    this.name = "RequestValidationError";
  }
}

export class DocumentContentError extends PublicFunctionError {
  constructor(code: string, message: string, status = 422) {
    super(code, message, status);
    this.name = "DocumentContentError";
  }
}

export class ProviderConfigurationError extends PublicFunctionError {
  constructor(
    message =
      "The real AI provider has not been configured by the project administrator.",
  ) {
    super("AI_PROVIDER_NOT_CONFIGURED", message, 503);
    this.name = "ProviderConfigurationError";
  }
}

export class MockModeError extends PublicFunctionError {
  constructor() {
    super(
      "REAL_AI_REQUIRED",
      "Real resume analysis is unavailable while AI_PROVIDER=mock. Configure a real server-side provider and try again.",
      503,
    );
    this.name = "MockModeError";
  }
}

export class ProviderAuthenticationError extends PublicFunctionError {
  constructor() {
    super(
      "AI_PROVIDER_AUTHENTICATION_FAILED",
      "The AI provider rejected its server credentials. Ask the project administrator to verify the provider secret.",
      502,
    );
    this.name = "ProviderAuthenticationError";
  }
}

export class ProviderUnavailableError extends PublicFunctionError {
  constructor() {
    super(
      "AI_PROVIDER_UNAVAILABLE",
      "The AI provider is currently unavailable. Please try again shortly.",
      503,
    );
    this.name = "ProviderUnavailableError";
  }
}

export class ProviderNetworkError extends PublicFunctionError {
  constructor() {
    super(
      "AI_PROVIDER_NETWORK_ERROR",
      "The AI provider could not be reached. Please check the connection and try again.",
      503,
    );
    this.name = "ProviderNetworkError";
  }
}

export class MalformedProviderResponseError extends PublicFunctionError {
  constructor() {
    super(
      "AI_PROVIDER_INVALID_RESPONSE",
      "The AI provider returned an invalid analysis. Please try again.",
      502,
    );
    this.name = "MalformedProviderResponseError";
  }
}

export class AnalysisPersistenceError extends PublicFunctionError {
  constructor() {
    super(
      "ANALYSIS_PERSISTENCE_FAILED",
      "The analysis was generated but could not be saved. Please try again.",
      500,
    );
    this.name = "AnalysisPersistenceError";
  }
}
