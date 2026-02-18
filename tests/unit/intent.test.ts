import { classifyIntent, Intent, IntentType } from "../../src/intent";

describe("classifyIntent – intent classification", () => {
  describe("DEBUG_FAILURE phrases", () => {
    const cases = [
      "why did the deployment fail",
      "what went wrong with the pipeline",
      "debug the last deploy",
      "explain failure",
      "why is it broke",
    ];
    test.each(cases)('"%s" → DEBUG_FAILURE', (phrase) => {
      const result = classifyIntent(phrase);
      expect(result.type).toBe("DEBUG_FAILURE");
      expect(result.primaryTool).toBe("list_executions");
      expect(result.requiresConfirm).toBe(false);
      expect(result.filters?.status).toBe("FAILED");
    });
  });

  describe("TRIGGER_PIPELINE phrases", () => {
    const cases = [
      "trigger the deploy pipeline",
      "run build now",
      "start the pipeline",
      "start deploy",
    ];
    test.each(cases)('"%s" → TRIGGER_PIPELINE', (phrase) => {
      const result = classifyIntent(phrase);
      expect(result.type).toBe("TRIGGER_PIPELINE");
      expect(result.requiresConfirm).toBe(true);
      expect(result.dryRunByDefault).toBe(true);
    });
  });

  describe("PROMOTE_BUILD phrases", () => {
    it("extracts sourceEnv and targetEnv from promote phrase", () => {
      const result = classifyIntent("promote staging to production");
      expect(result.type).toBe("PROMOTE_BUILD");
      expect(result.requiresConfirm).toBe(true);
      expect(result.sourceEnv).toBe("staging");
      expect(result.targetEnv).toBe("production");
    });

    it("handles promote build without env tokens", () => {
      const result = classifyIntent("promote build");
      expect(result.type).toBe("PROMOTE_BUILD");
      expect(result.sourceEnv).toBeUndefined();
      expect(result.targetEnv).toBeUndefined();
    });
  });

  describe("RELEASE_NOTES phrases", () => {
    const cases = [
      "generate release notes",
      "what shipped last week",
      "summarize the last build",
      "generate changelog",
    ];
    test.each(cases)('"%s" → RELEASE_NOTES', (phrase) => {
      const result = classifyIntent(phrase);
      expect(result.type).toBe("RELEASE_NOTES");
      expect(result.requiresConfirm).toBe(false);
      expect(result.filters?.status).toBe("SUCCESS");
    });
  });

  describe("LIST_EXECUTIONS phrases", () => {
    const cases = [
      "show me the last execution",
      "show me recent pipeline runs",
      "list executions",
      "what pipelines ran today",
    ];
    test.each(cases)('"%s" → LIST_EXECUTIONS', (phrase) => {
      const result = classifyIntent(phrase);
      expect(result.type).toBe("LIST_EXECUTIONS");
      expect(result.primaryTool).toBe("list_executions");
    });
  });

  describe("LIST_SERVICES phrases", () => {
    it('"list all services" → LIST_SERVICES', () => {
      expect(classifyIntent("list all services").type).toBe("LIST_SERVICES");
    });
    it('"show me services" → LIST_SERVICES', () => {
      expect(classifyIntent("show me services").type).toBe("LIST_SERVICES");
    });
  });

  describe("AUDIT phrases", () => {
    const cases = [
      "who changed the pipeline",
      "show audit trail",
      "recent changes to production",
    ];
    test.each(cases)('"%s" → AUDIT', (phrase) => {
      expect(classifyIntent(phrase).type).toBe("AUDIT");
    });
  });

  describe("UNKNOWN fallback", () => {
    it("returns UNKNOWN for an unrecognisable phrase", () => {
      const result = classifyIntent("what is the weather like");
      expect(result.type).toBe("UNKNOWN");
      expect(result.requiresConfirm).toBe(false);
    });
  });

  describe("read-only intents never require confirmation", () => {
    const readIntents: string[] = [
      "why did the deployment fail",
      "show me recent executions",
      "generate release notes",
      "list all services",
      "show audit trail",
    ];
    test.each(readIntents)('"%s" should not requiresConfirm', (phrase) => {
      expect(classifyIntent(phrase).requiresConfirm).toBe(false);
    });
  });
});
