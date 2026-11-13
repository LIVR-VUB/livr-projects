# Access tokens

The [Members area](members.md) lists all repositories of the LIVR-VUB organisation, including private ones. Access requires a personal GitHub access token: a read-only credential that identifies you to GitHub. Each member creates their own token. Setup takes about two minutes and needs to be repeated only when the token expires.

!!! warning "Use a personal token"
    A token should be treated like a password. Do not share it with colleagues or include it in code, messages or presentations. Personal tokens allow access to be revoked for one person without affecting others.

## Creating a token

1. Sign in to GitHub and open [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new).
2. **Token name:** `LIVR Project Catalogue`.
3. **Resource owner:** select **LIVR-VUB**. This setting is essential; a token owned by your personal account cannot list the organisation's private repositories.
4. **Expiration:** choose a date, for example one year from today.
5. **Repository access:** select **All repositories**.
6. **Permissions → Repository permissions:**
    - **Metadata:** Read-only (required; lists repositories and their topics).
    - **Contents:** Read-only (optional; allows a summary to be taken from the README when a repository has no description).
7. Select **Generate token** and copy the value, which begins with `github_pat_`. GitHub displays it only once.

The token is read-only and cannot modify, delete or push to any repository.

## Signing in

Open the [Members area](members.md), paste the token and select **Sign in**.

- By default, the token is discarded when the browser tab is closed.
- Select **Keep me signed in on this device** on a personal computer to avoid re-entering it.
- Select **Sign out** to remove the token from the browser.

The token is stored only in your browser and is sent exclusively to `api.github.com`. It is never transmitted to this website.

## Troubleshooting

| Message | Resolution |
|---|---|
| The token is invalid or has expired | Create a new token as described above. |
| The token has not been approved for LIVR-VUB | An organisation owner must approve the request under **LIVR-VUB → Settings → Personal access tokens → Pending requests**. |
| The token has no access to LIVR-VUB | The resource owner was set to your personal account. Create a new token with **LIVR-VUB** as resource owner. |
| No private repositories are visible | The token may still await approval, or your account may not yet be a member of LIVR-VUB. Contact an organisation owner. |

??? note "Organisation settings (owners only)"
    Under **LIVR-VUB → Settings → Personal access tokens**:

    - **Fine-grained personal access tokens:** allow access.
    - **Approval:** optionally require approval, in which case each member's token is approved once.
