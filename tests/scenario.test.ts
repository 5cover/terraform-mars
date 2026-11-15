import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { scenario } from 'terraform-mars';
import abandonedServer from 'terraform-mars/scenarios/abandoned-server';
import aperture1995 from 'terraform-mars/scenarios/aperture-1995';
import brokenArchive from 'terraform-mars/scenarios/broken-archive';
import closedNetwork from 'terraform-mars/scenarios/closed-network';
import competingProjects from 'terraform-mars/scenarios/competing-projects';
import industrialist from 'terraform-mars/scenarios/industrialist';
import internationalMandate from 'terraform-mars/scenarios/international-mandate';
import livingMars from 'terraform-mars/scenarios/living-mars';
import martianSettlement from 'terraform-mars/scenarios/martian-settlement';
import millionaire from 'terraform-mars/scenarios/millionaire';
import spaceAgency from 'terraform-mars/scenarios/space-agency';
import studentExperiment from 'terraform-mars/scenarios/student-experiment';

const marker = '<!-- TERRAFORM_MARS_MANDATE -->';

describe('scenario framing', () => {
  it('ships separate fictional framings', () => {
    for (const framing of [
      abandonedServer,
      aperture1995,
      brokenArchive,
      closedNetwork,
      competingProjects,
      industrialist,
      internationalMandate,
      livingMars,
      martianSettlement,
      millionaire,
      spaceAgency,
      studentExperiment,
    ]) {
      assert.equal(framing.split(marker).length - 1, 1);
      assert.match(framing, /speculative-fiction exercise/);
    }
    assert.match(millionaire, /Simon Delcourt/);
    assert.match(spaceAgency, /public space agency/);
    assert.match(aperture1995, /Aperture Science/);
  });

  it('inserts the exact mandate once with a safe fence', () => {
    const mandate = 'Opening\n```js\nexample()\n```\nA ```` longer run.\n';
    const output = scenario(mandate, `Before\n\n${marker}\n\nAfter`);
    assert.equal(output.split(mandate).length - 1, 1);
    assert.match(output, /Before\n\n`````\nOpening/);
    assert.match(output, /longer run\.\n`````\n\nAfter$/);
  });

  it('requires exactly one insertion marker', () => {
    assert.throws(() => scenario('mandate', 'no marker'), /exactly once/);
    assert.throws(() => scenario('mandate', `${marker}\n${marker}`), /exactly once/);
  });
});
