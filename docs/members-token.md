# :material-key: Get a token for the members section

The [LIVR members](members.md) page shows all LIVR-VUB projects, private ones too. To see them, your browser needs a **GitHub token**: a read-only key that proves you are a LIVR member. Each member makes **their own** token. It takes about 2 minutes and you only do it once (until it expires).

!!! warning "Please don't share tokens"
    A token is like a password. Use your own, so access can be removed for one person without breaking it for everyone.

## Create the token

1. Open **[github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)** (you must be logged in to GitHub).
2. **Token name:** `LIVR catalogue`
3. **Resource owner:** choose **LIVR-VUB** (not your own name). This is the most important step.
4. **Expiration:** pick a date, e.g. 1 year.
5. **Repository access:** **All repositories**.
6. **Permissions → Repositories → Add permissions:**
    - **Metadata**: Read-only (needed; lists the repos and their tags)
    - **Contents**: Read-only (optional; lets the page show a summary from the README when a repo has no description)
7. Click **Generate token** and **copy** it (it starts with `github_pat_`). GitHub shows it only once.

The token is **read-only**. It cannot change, delete or push anything.

## Use it

Go to [LIVR members](members.md), paste the token and click **Show LIVR projects**.

- By default the token is forgotten when you close the tab.
- Tick **Remember on this device** on your own laptop so you don't have to paste it again.
- Click **Sign out** to remove it from the browser.

The token stays in your browser and is sent only to `api.github.com`. This website never receives it.

## Troubleshooting

| You see | What to do |
|---|---|
| *"not valid or has expired"* | Make a new token (steps above). |
| *"not (yet) approved for LIVR-VUB"* | The org may require an owner to approve new tokens. Ask a LIVR-VUB owner to approve it under **LIVR-VUB → Settings → Personal access tokens → Pending requests**. |
| *"cannot see the LIVR-VUB organization"* | You chose your own account as **Resource owner**. Make a new token with **LIVR-VUB**. |
| *"shows no private repos"* | Same as above, or your GitHub account is not yet a member of LIVR-VUB. Ask an owner to add you. |

??? info "For org owners: one-time settings"
    In **LIVR-VUB → Settings → Personal access tokens**:

    - **Fine-grained tokens:** *Allow access via fine-grained personal access tokens*.
    - **Require approval:** your choice. With approval on, you approve each member's token once.
