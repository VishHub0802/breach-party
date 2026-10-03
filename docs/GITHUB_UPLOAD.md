# Upload Breach Party to your existing GitHub repository

Extract the ZIP and open the folder containing `app`, `lib`, `README.md`, and `package.json`. Its contents belong directly at the top level of your repository.

## GitHub Desktop: recommended

1. Install [GitHub Desktop](https://desktop.github.com/) and sign in.
2. Choose **File → Clone repository**, select the repository you already created, and click **Clone**. You can also paste your repository link under the URL tab.
3. Open the cloned repository folder in File Explorer or Finder.
4. Copy all the extracted project's files and folders into it, including the dotfiles and `.openai` folder. `app` and `package.json` should sit directly inside the repository. Merge any existing README content you want to keep with the included README.
5. Review GitHub Desktop's **Changes** list. The included `.gitignore` excludes installed dependencies, environment files, local runtime state, and generated output.
6. In **Summary**, enter `Add Breach Party public game`.
7. Click **Commit to main**, or the displayed default branch name. For a protected branch, use a new branch and a pull request.
8. Click **Push origin**. An empty repository may instead show **Publish branch** for the first push.
9. Click **View on GitHub** and verify the README, source folders, and configuration appear at the top level.

Clone makes a local copy of your existing repository. Commit saves a snapshot on your computer. Push uploads it to GitHub.

## Browser-only alternative

GitHub's upload page accepts at most 100 files at a time. This project needs two batches:

1. Open the repository and choose **Add file → Upload files**, or the uploading-an-existing-file link for an empty repository.
2. Drag in all the extracted project's top-level files and folders except `components`. Commit with `Add game source and documentation`.
3. Open **Upload files** again and drag in the `components` folder, retaining its name and subfolders. Commit with `Add interface components`.
4. Verify `components/ui`, `.openai/hosting.json`, `.gitignore`, `README.md`, and `package.json` alongside `app` and `lib`. Upload any included dotfiles that your file chooser omitted.

If your branch requires pull requests, complete that workflow. GitHub Desktop handles the complete folder structure in one push.

## What to include

Keep all the source, configuration, dependency lockfile, migration, tests, documentation, and bundled license notices in this package. Installed dependencies, generated builds, local databases, environment files, and Git history are already excluded. Upload the extracted project files so GitHub can display the README and code.

Keep `.openai/hosting.json`; the build imports it. It contains the existing Sites project ID and logical database binding, not account credentials.

Set your repository's website link to https://breach-party.vreddy0802.chatgpt.site. A suitable description is “Multiplayer cybersecurity party game with room codes, synchronized rounds, Standard and Hard modes, and replay.”

GitHub stores the source; players use the deployed game link. This upload does not connect GitHub to automatic deployment.

## Official instructions

- [Clone with GitHub Desktop](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-and-forking-repositories-from-github-desktop)
- [Commit and push](https://docs.github.com/en/desktop/making-changes-in-a-branch/committing-and-reviewing-changes-to-your-project-in-github-desktop)
- [Upload through the website](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [GitHub Pages provides static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
