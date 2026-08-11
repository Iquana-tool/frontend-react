import React from "react";

const DatasetsSection = () => {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-semibold text-t1 mb-2 sm:mb-3">Creating Datasets</h3>
        <p className="text-t2 mb-3 sm:mb-4 text-sm sm:text-base">
          Datasets are collections of images that you want to analyze. Each dataset can contain 
          multiple images and supports various image formats.
        </p>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h4 className="font-semibold text-t1 text-base sm:text-lg">Dataset Workflow</h4>
        <div className="space-y-2.5 sm:space-y-3">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="bg-acS text-ac rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h5 className="font-medium text-t1 text-sm sm:text-base">Upload Images</h5>
              <p className="text-t2 text-xs sm:text-sm">Drag and drop or select multiple image files to create your dataset.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="bg-acS text-ac rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h5 className="font-medium text-t1 text-sm sm:text-base">Define Labels</h5>
              <p className="text-t2 text-xs sm:text-sm">Create custom labels for different coral types or regions you want to identify.</p>
            </div>
          </div>
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="bg-acS text-ac rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-semibold flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h5 className="font-medium text-t1 text-sm sm:text-base">Start Annotation</h5>
              <p className="text-t2 text-xs sm:text-sm">Begin annotating your images using AI assistance or manual tools.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <h4 className="font-semibold text-t1 text-base sm:text-lg">Image Metadata</h4>
        <p className="text-t2 text-sm sm:text-base">
          Images can carry free-form key/value metadata — site, transect, treatment,
          collection date — which is how a dataset is split into the subgroups your
          analysis compares. Edit it in <strong>Data Management</strong>: the tag
          button on a thumbnail edits one image, and ticking several images edits
          them together.
        </p>
        <ul className="list-disc list-inside text-t2 text-xs sm:text-sm space-y-1">
          <li>
            <strong>Import from a spreadsheet.</strong> "Import metadata" first
            downloads the current data as a CSV — one row per image, which for an
            untagged dataset is just a column of filenames. Fill it in, upload it
            back, and check the preview: it reports which rows matched, which
            filenames it could not find, and what type each new column looks like.
            Nothing is written until you approve it.
          </li>
          <li>
            The metadata row above the grid filters the gallery down to a subgroup.
            Values of one key are combined with OR, different keys with AND.
          </li>
          <li>
            The <strong>Untagged</strong> chip shows the images the grouping has
            missed so far.
          </li>
          <li>
            Metadata travels into the exports: one <code>meta_&lt;key&gt;</code>{" "}
            column per key in the quantification CSV/JSON, and a{" "}
            <code>metadata</code> object on each image in the COCO export.
          </li>
        </ul>
      </div>

      <div className="space-y-2 sm:space-y-3">
        <h4 className="font-semibold text-t1 text-base sm:text-lg">Metadata Key Types</h4>
        <p className="text-t2 text-sm sm:text-base">
          Every key has a type, which decides how you filter on it and whether it
          can group a quantification. A key you simply type in becomes a{" "}
          <strong>Category</strong>; change it under <strong>Manage keys</strong>.
        </p>
        <ul className="list-disc list-inside text-t2 text-xs sm:text-sm space-y-1">
          <li>
            <strong>Category</strong> — a small repeating vocabulary (site,
            treatment). Filter by chips. This is the type that can group results.
          </li>
          <li>
            <strong>Number</strong> — a measured quantity with an optional unit.
            Filter by range.
          </li>
          <li>
            <strong>Date</strong> — stored as <code>YYYY-MM-DD</code>. Filter by
            range; other spellings are converted on the way in.
          </li>
          <li><strong>Yes / no</strong> — a flag, however it was written.</li>
          <li>
            <strong>Free text</strong> — a note. Filter by substring; never offered
            as a grouping.
          </li>
        </ul>
        <p className="text-t2 text-xs sm:text-sm">
          Changing a type re-checks every value already stored and is refused, naming
          the offenders, if any no longer fit — so marking a key numeric can never
          quietly drop the one image that says "shallow". Keys are matched exactly,
          so <code>Site</code> and <code>site</code> are two groups; if that happens,
          rename one onto the other under Manage keys to merge them.
        </p>
      </div>
    </div>
  );
};

export default DatasetsSection; 