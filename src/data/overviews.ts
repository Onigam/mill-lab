// The text of the side panel while nothing is selected in a world: `{ title, text }` per world, for the lead to wire in src/lab.ts
// (`scenes[i].overview = { ...OVERVIEWS.site, actions: [...] }`; the actions are the lead's, with the `go…` strings of src/i18n/ui.ts).
// Bold on part names, what to look at, how to start; a blank line is a paragraph break. The tone of the series: a curious, concrete
// explanation for a curious adult. Numbers: the design point (an assumption and a derivation) and the model's results, said as such.
// The screw is generic; the prototype's 200 W and the 2 kW target are reported hopes of the video, never results.
import { l, type L } from '@onigam/lab-kit/i18n';
import type { WorldId } from '../part-ids';
import { lf } from './part-helpers';

export const OVERVIEWS: Record<WorldId, { title: L; text: L }> = {
  site: {
    title: l('Une vis d’Archimède dans un bief de moulin', 'An Archimedes screw in a mill race'),
    text: lf(
      'La **rivière**, retenue par un **seuil**, envoie une part de son eau dans le **bief d’amenée**, à travers une **grille grossière** et une **vanne de tête**, jusqu’à la **chambre d’eau** de l’ancien **moulin**. Une **échancrure du débit réservé** laisse sa part à la rivière, une **passe à poissons** permet de la remonter, et l’eau turbinée revient par le **canal de fuite**. L’électricité file au **local technique**, puis à la **maison**.\n\n**Pour commencer** : cliquez la **chambre d’eau** pour y entrer et voir la vis, puis lancez la **Simulation**. Au point de calcul du labo, {head} m de chute (hypothèse) et {flowLs} L/s (dérivé), le modèle trouve {waterKw} kW d’eau et {elecKw} kW dans la batterie, soit {etaAll} % (résultat du modèle) ; les 200 W du prototype de la vidéo et les 2 kW visés sont des espoirs annoncés, pas des mesures.\n\nReconstitution pédagogique indépendante, pas un plan de construction : la vis est générique. Un canal et une chambre d’eau sont des lieux où l’on se noie, n’y allez jamais seul.',
      'The **river**, held by a **weir**, sends a share of its water into the **headrace**, through a **coarse rack** and a **head gate**, to the **water chamber** of the old **mill building**. A **reserved-flow notch** leaves the river its share, a **fish pass** lets fish swim back up, and the used water returns by the **tailrace**. The electricity goes to the **powerhouse**, then to the **house**.\n\n**To start**: click the **water chamber** to go in and see the screw, then run the **Simulation**. At the lab’s design point, {head} m of head (assumption) and {flowLs} L/s (derived), the model finds {waterKw} kW of water and {elecKw} kW into the battery, that is {etaAll}% (model result); the prototype’s 200 W in the video and the 2 kW aimed at are announced hopes, not measurements.\n\nAn independent educational reconstruction, not a construction plan: the screw is generic. A canal and a water chamber are places where people drown, never go there alone.',
    ),
  },
  screw: {
    title: l('La vis dans sa chambre', 'The screw in its chamber'),
    text: lf(
      'L’eau entre par le **seuil d’entrée**, se range dans les **poches d’eau** entre les pales et descend le long de l’**auge** en faisant tourner la vis : trois filets de **modules de pales**, tenus sur le **noyau central** par des **fixations** et portés par un **palier haut** et un **palier bas**. Elle repart par le **bassin de sortie**. La vis tourne à {rpm} tr/min (résultat du modèle) ; une **chaîne** puis une **courroie**, avec leurs pignons et leurs poulies sur l’**arbre intermédiaire**, multiplient cette vitesse jusqu’à la **génératrice**, dont le **redresseur** et le **régulateur de charge** chargent la **batterie**.\n\n**À regarder** : suivez une poche du haut au bas de la vis ; ralentissez la rotation, activez **Flux**, puis changez le jeu ou la vitesse dans la **Simulation**. **Attention** : une vis qui tourne happe un bras, une manche, des cheveux. Jamais de main près de la chaîne, de la courroie ou des pales.',
      'The water comes in over the **inlet sill**, settles in the **water pockets** between the blades and runs down the **trough**, turning the screw: three threads of **blade modules**, held on the **screw core** by **fasteners** and carried by an **upper bearing** and a **lower bearing**. It leaves through the **outlet pool**. The screw turns at {rpm} rpm (model result); a **chain** then a **belt**, with their sprockets and pulleys on the **countershaft**, multiply that speed up to the **generator**, whose **rectifier** and **charge controller** charge the **battery**.\n\n**What to look at**: follow one pocket from the top to the bottom of the screw; slow the rotation, switch on **Flows**, then change the gap or the speed in the **Simulation**. **Careful**: a turning screw snatches an arm, a sleeve, hair. Never a hand near the chain, the belt or the blades.',
    ),
  },
};
