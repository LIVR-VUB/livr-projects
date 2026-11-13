# Contributing

The catalogue is generated automatically from the metadata of each repository in the [LIVR-VUB](https://github.com/LIVR-VUB) organisation. It is never edited by hand. To make a repository easy to find, maintain two fields on GitHub: a **description** and one or more **topics**.

## 1. Write a description

Open the repository on GitHub, select the settings control next to **About**, and complete the **Description** field. Use one sentence that states what the code does and on which data. For example:

> Quantification of LSEC fenestration from AFM images using a U-Net segmentation model.

If no description is set, the catalogue uses the first paragraph of the repository's README.

## 2. Assign topics

In the same **About** panel, add one or more **Topics**. Topics determine the project type under which the repository is listed. Recognised topics per type:

| Project type | Topics |
|---|---|
| Single-cell RNA-seq | `scrna-seq`, `scrnaseq`, `single-cell`, `splitseq`, `hsc-atlas` |
| Bulk RNA-seq | `bulkrnaseq`, `rna-seq`, `rnaseq`, `quantseq`, `deconvolution` |
| Proteomics | `proteomics`, `bulkproteomics` |
| Metabolomics and Lipidomics | `metabolomics`, `lipidomics`, `mass-spectrometry` |
| Multi-omics | `multiomics`, `bulk-omics`, `spatial-transcriptomics` |
| Cell Painting | `cellpainting`, `cellprofiler`, `cytomining`, `image-based-profiling`, `high-content-screening` |
| Microscopy and Image Analysis | `image-analysis`, `image-processing`, `microscopy`, `cellpose`, `afm` |
| Plate Design and Lab Tools | `platemap`, `plate-tools`, `96well` |
| Machine Learning | `machine-learning`, `deep-learning` |
| Computing and Containers | `hpc`, `hpc-containers`, `singularity-container`, `docker` |
| Lab Resources and Onboarding | `livr-onboarding`, `foundational-repository`, `tools`, `template` |
| Reports and Publications | `jhep-reports`, `final-version`, `publication` |

The complete mapping, including name keywords (for example `_CP_` for Cell Painting), is maintained in [`categories.yml`](https://github.com/LIVR-VUB/livr-projects/blob/main/categories.yml). Descriptive topics such as `lx2`, `ipsc`, `tgf-beta` or a researcher's name are encouraged as well; they become filters within each project type.

## 3. Update schedule

The catalogue is rebuilt every hour. To publish changes immediately, open the `livr-projects` repository and run **Actions → Build project catalogue → Run workflow**.

## Adding a project type

Edit `categories.yml` in the `livr-projects` repository and add an entry with a `name`, a `slug` (used in the page address), an `icon`, a `colour`, a one-sentence `description`, the `topics` that belong to it and, optionally, name `keywords`. The site is rebuilt automatically when the file changes.

## Repository conventions

To keep the catalogue consistent, new repositories should follow these conventions:

- **Naming:** lowercase words separated by hyphens, starting with the method or data type, for example `scrnaseq-hsc-activation` or `afm-fenestrae-quantification`.
- **README:** state the purpose, the input data, how to run the analysis and the expected output.
- **Visibility:** keep repositories private until the associated work is published; they remain visible to members in the [Members area](members.md).
