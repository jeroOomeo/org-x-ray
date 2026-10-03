export function isTestClass(body: string): boolean {
  return /@istest[\s\S]{0,200}?\bclass\b/i.test(stripComments(body).slice(0, 2000));
}

// Blank out comments but leave string literals alone ('https://...' isn't a comment).
// Newlines are kept so line numbers still match.
export function stripComments(body: string): string {
  return body.replace(/('(?:\\.|[^'\\\n])*')|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match, literal: string | undefined) =>
    literal ?? match.replace(/[^\n]/g, ' ')
  );
}

export function stripStrings(body: string): string {
  return body.replace(/'(?:\\.|[^'\\])*'/g, "''");
}

// Sample classes SF drops into orgs with Experience Cloud / Sites. Still reported, just low.
const GENERATED = new Set([
  'ChangePasswordController',
  'CommunitiesLandingController',
  'CommunitiesLoginController',
  'CommunitiesSelfRegConfirmController',
  'CommunitiesSelfRegController',
  'ForgotPasswordController',
  'LightningForgotPasswordController',
  'LightningLoginFormController',
  'LightningSelfRegisterController',
  'MicrobatchSelfRegController',
  'MyProfilePageController',
  'SiteLoginController',
  'SiteRegisterController',
]);

export function isGeneratedClass(name: string): boolean {
  return GENERATED.has(name) || GENERATED.has(name.replace(/Test$/, ''));
}

export function lineOf(body: string, offset: number): number {
  return body.slice(0, offset).split('\n').length;
}
