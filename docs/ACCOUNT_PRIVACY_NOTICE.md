# Account Privacy Notice

**Status:** Prepared for production review; do not publish or enable accounts until every bracketed field is completed.

**Effective date:** [EFFECTIVE DATE]

## What the optional account does

The Subnet Game works without an account. Anonymous Journey progress remains in the learner's browser and is never uploaded by account synchronization.

A learner may optionally create an account with a verified email address. While signed in, the learner can choose when to synchronize completed Journey challenges across browsers or devices. Synchronization is manual, not continuous.

## Data collected

The account service processes only:

- Verified email address
- Managed account/user ID
- Account creation timestamp
- Catalog fingerprint
- Completed question ordinal
- Learner-reported completion timestamp
- Database row creation timestamp
- Authentication, delivery, security, and abuse-prevention logs maintained by the configured providers

The account system does not collect typed subnet answers, timed-mode scores, anonymous browser progress, marketing consent, payment data, or an Academy/LMS identity.

## Why the data is used

Account data is used to:

- Authenticate the learner with a one-time email code
- Store and return manually synchronized Journey completion
- Protect accounts and investigate delivery or abuse problems
- Provide authenticated self-service export and deletion

Registration does not subscribe the learner to marketing email.

## Storage and providers

Account and synchronized-progress data is hosted in the project-owned Supabase environment. Authentication email is delivered by the approved project-owned email provider.

Before publication, identify the providers here:

- Database/authentication provider: [SUPABASE PROJECT OWNER/REGION]
- Authentication email provider: [EMAIL PROVIDER]
- Operational monitoring provider: [MONITORING PROVIDER]

## Retention

Account and manually synchronized progress data is retained while the account exists. The learner can permanently delete the account at any time from the account screen.

Security, email-delivery, and abuse-prevention logs may have separate provider-controlled retention periods. Record those periods before launch: [LOG RETENTION PERIODS].

No automatic inactive-account deletion is promised. If an inactivity policy is introduced later, update this notice and provide reasonable advance notice before deleting learner data.

## Export and deletion

A signed-in learner can download a versioned JSON export from the account screen. The export includes account metadata and synchronized completion rows.

A signed-in learner can permanently delete the account after typing `DELETE`. The database verifies that the requesting authenticated user owns the account. Deletion removes the managed authentication account and cascades through the app-owned profile and synchronized-progress rows. After successful deletion, the app removes that account's browser cache. Anonymous browser progress remains untouched.

Deletion is intended to be permanent and cannot be undone. Provider backups may age out according to the documented provider backup-retention schedule: [BACKUP RETENTION PERIOD].

## Learner choices

Learners may:

- Use the game anonymously without creating an account
- Choose when to synchronize signed-in completion
- Download their account data
- Delete their account
- Contact the project about a privacy or account-data concern

## Contact

Data controller/legal owner: [LEGAL OWNER]

Privacy contact: [PRIVACY EMAIL OR FORM]

Project jurisdiction/address, if required: [JURISDICTION/ADDRESS]

## Important trust boundary

Synchronized completion is learner-reported practice continuity. It is not verified mastery, an exam result, employment evidence, or an authoritative credential.
