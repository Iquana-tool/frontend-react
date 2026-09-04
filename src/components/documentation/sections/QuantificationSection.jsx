import React from "react";

/**
 * How quantification works, as the app actually does it.
 *
 * This section used to describe a per-contour table with per-row delete buttons and
 * label-tag filters, which was the pre-profile quantification panel and has not existed
 * for some time. Every claim below is about a surface that is currently on screen.
 */

const Card = ({ title, children }) => (
  <div className="bg-p1 border border-ln rounded-lg p-4">
    <h5 className="font-medium text-t1 mb-1">{title}</h5>
    <p className="text-t2 text-sm">{children}</p>
  </div>
);

const QuantificationSection = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-t1 mb-3">Quantification</h3>
        <p className="text-t2 mb-4">
          Every annotated object is measured. Which measurements are taken is not fixed:
          a dataset has one or more <strong>quantification profiles</strong>, and a profile
          is a chosen set of metrics, each optionally scoped to particular labels. Nothing
          is computed until something asks for it, so adding a metric to a profile is
          cheap and reversible.
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-t1 mb-3">Metric tiers</h4>
        <p className="text-t2 mb-3">
          Metrics are grouped by what they need in order to be computed, which is also what
          they cost:
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          <Card title="Geometry">
            Shape alone — area, perimeter, circularity, maximum diameter. Computed from the
            outline, so they are the cheapest and are in the default profile.
          </Card>
          <Card title="Appearance">
            Mean colour and intensity. Needs the image pixels decoded, so the first request
            after a bulk import pays for that once and later ones are cached.
          </Card>
          <Card title="Contextual">
            Where an object sits relative to its neighbours, e.g. nearest-neighbour
            distance. Objects with no neighbour are excluded, so these counts can be lower
            than the object count.
          </Card>
          <Card title="Relational">
            An object's place in the hierarchy, e.g. how many children it has.
          </Card>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-t1 mb-3">Units and scale</h4>
        <p className="text-t2 mb-3">
          Measurements are stored in pixels and converted for display. Real-world units are
          only reported when everything being pooled shares one unit — so a dataset whose
          images are calibrated differently (or only partly calibrated) falls back to
          pixels and says so. Calibrate images in the workspace's Calibrate mode to get
          physical units.
        </p>
        <p className="text-t2">
          The per-image view is the exception, and not a special case: one image is always
          consistent with itself, so a calibrated image reports its own real-world units
          even inside a dataset that mixes them.
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-t1 mb-3">What counts</h4>
        <p className="text-t2">
          By default only finished work is measured: objects on masks marked fully
          annotated, that someone has reviewed. Two toggles above the results
          (<strong>Include in-progress masks</strong> and{" "}
          <strong>Include unreviewed objects</strong>) widen that. The object counts shown
          per label are deliberately unfiltered, so they can be read as the denominator —
          how much of the class exists, against how much of it has been measured.
        </p>
      </div>

      <div>
        <h4 className="font-semibold text-t1 mb-3">Where to look</h4>
        <div className="space-y-3">
          <Card title="Dataset Quantifications — Overview">
            Aggregated per label, following the label hierarchy: count, mean, standard
            deviation and range for each metric in the profile. Objects with no label are
            measured here and only here.
          </Card>
          <Card title="Dataset Quantifications — Objects">
            One row per object, in an interactive table that also pivots, filters and
            plots. This is the same data as the CSV export, and needs the export
            permission.
          </Card>
          <Card title="Dataset Quantifications — Per image">
            One image at a time: the image, its objects and its measurements side by side,
            each compared against the dataset average — which is how an image that measures
            unlike the rest of the dataset gets noticed. Selecting a row frames that object
            on the image, so a value that looks wrong can be traced to the annotation
            behind it. Its object table also pivots, and opens grouped by parent object so
            children sit under what contains them. Also reachable from the chart button on
            any image tile in <strong>Data Management</strong>.
          </Card>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-t1 mb-3">Export</h4>
        <p className="text-t2">
          Both pages export what they show, as CSV or JSON: one row per object, one column
          per metric (a multi-component metric such as mean colour becomes one column per
          channel), plus each image's metadata and each object's parent, so the subgroup
          and the hierarchy survive the flattening. The export follows the active profile
          and the inclusion toggles, so the file always matches the numbers on screen.
        </p>
      </div>
    </div>
  );
};

export default QuantificationSection;
