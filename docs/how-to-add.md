# Contributing

The catalogue is generated automatically from the metadata of each repository in the [LIVR-VUB](https://github.com/LIVR-VUB) organisation. It is never edited by hand. To make a repository easy to find, maintain two fields on GitHub: a **description** and one or more **topics**.

## 1. Write a description

Open the repository on GitHub, select the settings control next to **About**, and complete the **Description** field. Use one sentence that states what the code does and on which data. For example:

> Quantification of LSEC fenestration from AFM images using a U-Net segmentation model.

If no description is set, the catalogue uses the first paragraph of the repository's README.

## 2. Assign topics

In the same **About** panel, add one or more **Topics**. Topics determine the research area under which the repository is listed.

| Research area | Recommended topics |
|---|---|
| Transcriptomics | `rna-seq`, `scrna-seq`, `single-cell`, `transcriptomics`, `deconvolution` |
| Metabolomics and Lipidomics | `metabolomics`, `lipidomics`, `mass-spectrometry` |
| Cell Painting and High-Content Screening | `cell-painting`, `cellprofiler`, `cytomining`, `platemap` |
| Imaging and Image Analysis | `image-analysis`, `microscopy`, `afm`, `organoids`, `segmentation` |
| Spatial and Multi-omics | `spatial-transcriptomics`, `multiomics`, `proteomics` |
| Machine Learning | `machine-learning`, `deep-learning` |
| Computing Infrastructure | `hpc`, `containers`, `singularity`, `docker` |

The complete mapping is maintained in [`categories.yml`](https://github.com/LIVR-VUB/livr-projects/blob/main/categories.yml). Additional descriptive topics such as `liver`, `lsec`, `hsc` or `masld` are encouraged; they become filters in the [Repository index](all.md).

## 3. Update schedule

The catalogue is rebuilt every hour. To publish changes immediately, open the `livr-projects` repository and run **Actions → Build project catalogue → Run workflow**.

## Adding a research area

Edit `categories.yml` in the `livr-projects` repository and add an entry with a `name`, a `slug` (used in the page address), a one-sentence `description` and the list of `topics` that belong to it. The site is rebuilt automatically when the file changes.

## Repository conventions

To keep the catalogue consistent, new repositories should follow these conventions:

- **Naming:** lowercase words separated by hyphens, starting with the method or data type, for example `scrnaseq-hsc-activation` or `afm-fenestrae-quantification`.
- **README:** state the purpose, the input data, how to run the analysis and the expected output.
- **Visibility:** keep repositories private until the associated work is published; they remain visible to members in the [Members area](members.md).
