import { connect } from 'pwa-helpers';
import { store } from './../../store/store';
import { State } from './../../store/reducer';
import { Mark } from './../../models/mark';
import { MarkerService } from './../../services/marker.service';
import { css, customElement, html, LitElement, property, unsafeCSS, query } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import './../bronco-chip/app.component';
import { updateMark, navigateToTab } from '../../store/actions';
import { Tag } from '../../models/tag';

const componentCSS = require('./app.component.scss');

/**
 * Modern chip
 * @event tagsChanged - Dispatched when tags changed and returns array of tags
 * @event submitTriggered - Submit event when user enters 'ENTER' twise
 * @slot - Default content.
 * @cssprop --bg-color - Background color
 * @cssprop --color - Font color
 * @cssprop --font-size - Font size
 * @cssprop --min-height - Min-height of the chip-list
 * @cssprop --primary-color - Primary color which is set on focus
 *
 */
@customElement('bronco-chip-list')
export class BroncoChipList extends connect(store)(LitElement) {
  static styles = css`${unsafeCSS(componentCSS)}`;
  markerService = new MarkerService();

  @query('#tag') inputElement!: HTMLInputElement;

  /**
   * Array of tags as strings
   *
   * @memberof BroncoChipList
   */
  @property()
  chips = [] as string[];

  @property()
  tags: Tag[];


  /**
   * This value will be set from the autoComplete component.
   * When the user submits and this value is truthy, it will be used to add the tag
   *
   * @memberof BroncoChipList
   */
  @property()
  autoCompleteValue = '';

  /**
   * Current mark
   *
   * @memberof BroncoChipList
   */
  @property()
  mark: Mark;

  /**
   * Property to set focus on input initially
   *
   * @memberof BroncoChipList
   */
  @property()
  focused = false;

  /**
   * Property to prevent to fast deleting. So that user has to click backspace twice.
   *
   * @memberof BroncoChipList
   */
  @property()
  markedToDelete = false;

  @property()
  hideOnOutsideClick = true;

  /**
   * Property to trigger submit after entering ENTER twice
   *
   * @memberof BroncoChipList
   */
  @property()
  markedToSubmit = false;



  /**
   * Current value for input for auto-complete
   *
   * @memberof BroncoChipList
   */
  @property()
  inputValue = ''

  firstUpdated() {
    this.tags = store.getState().tags;
    this.mark ? this.chips = this.mark.tags : '';
    document.addEventListener('click', () => this.markedToDelete = false);
    this.focused ? this.inputElement.focus() : '';
    this.hideOnOutsideClick ? this.closeOnOutsideClick() : '';
  }

  stateChanged(e: State) {
    if (this.mark && store.getState().lastAction === 'UPDATE_MARK') {
      this.tags = store.getState().tags;
      this.mark = e.marks.find(e => e.id === this.mark.id);
      this.chips = this.mark && this.mark.tags ? this.mark.tags : [];
    }
  }

  closeOnOutsideClick() {
    document.body.onclick = (e) => {

      if (e.target !== this && e.target['tagName'] !== 'MY-MARKER') {
        this.remove();
        document.body.onclick = undefined;
        this.dispatchEvent(new CustomEvent('closed'));
      }
    }
  }

  async disconnectedCallback() {
    this.mark && this.mark.tags ? this.mark.tags = this.chips : '';
  }

  async emit(deletedChip?: string) {
    this.dispatchEvent(
      new CustomEvent('tagsChanged', {
        bubbles: true,
        detail: { chips: [...new Set(this.chips)], deletedChip: deletedChip ? deletedChip : undefined }
      })
    );

    if (this.mark && this.mark.tags.length !== this.chips.length) {
      this.mark.tags = this.chips;
      await this.markerService.updateMark(this.mark);
    }
  }

  getAllTags() {
    let tags = store.getState().tags.map(tag => tag.name);
    tags = [...new Set(tags)];
    tags.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    return tags;
  }


  /**
   * Listen to keyboard event to either add or remove tags
   * Tags are being added when user enters space or enter
   *
   * @param {KeyboardEvent} e
   * @memberof BroncoChipList
   */
  async submitChip(e: KeyboardEvent) {

    // Stop Propagation not for arrow doww / arrow up and enter because auto complete listens for those events
    if (e.keyCode !== 40 && e.keyCode !== 38) {
      e.stopImmediatePropagation();
    }


    const target = e.target as HTMLInputElement;

    this.inputValue = target.value;

    if (target.value) {
      this.markedToDelete = false;
      this.markedToSubmit = false;
    }

    if (target.value && (e.key === 'Enter')) {
      // Either take the current autoComplete value or the inputElement value
      const tagValue = this.autoCompleteValue ? this.autoCompleteValue : target.value;
      this.addChip(tagValue);
      this.markedToSubmit = false;
      this.autoCompleteValue = '';
    }

    if (e.key === 'Backspace' && this.chips.length && !target.value.length) {
      if (this.markedToSubmit) {
        await this.deleteChip(target);
        this.markedToSubmit = false;
      } else {
        this.markedToSubmit = true;
      }
    }
    e.key !== 'Backspace' ? this.emit() : '';
  }

  /**
   * Adds a tag if current value is not empty.
   * It splits the current value by space
   *
   * @param {HTMLInputElement} target
   * @memberof BroncoChipList
   */
  addChip(tagValue: string) {
    // Map array to lower case to check case insensitive if tag already exists
    !this.chips.map(chip => chip.toLowerCase()).includes(tagValue.toLowerCase().trim()) ? this.chips = [...this.chips, tagValue.trim()] : '';
    this.inputElement.value = '';
  }

  /**
   * Deletes a tag if it is already marked as deleted.
   *
   * @param {HTMLInputElement} target
   * @memberof BroncoChipList
   */
  async deleteChip(target: HTMLInputElement) {
    if (this.markedToDelete && !target.value && this.chips.length) {
      this.filterChips(this.chips[this.chips.length - 1]);
      this.markedToDelete = false;
    } else {
      this.markedToDelete = true;
      this.requestUpdate();
    }
  }

  filterChips(chip: string) {
    this.chips = this.chips.filter(e => e !== chip);
    this.emit();
  }


  /**
   * Event triggered by the custom auto-complete component.
   *
   * If user clicks on autocomplete it has to be manually added. If user presses enter it will be captured by
   * the event listener of the inputElement.
   *
   * @param {CustomEvent} e
   * @param {boolean} [isClick]
   * @memberof BroncoChipList
   */
  autoCompleteEvent(e: CustomEvent, isClick?: boolean) {
    e.stopImmediatePropagation();
    if (isClick) {
      this.chips = [...new Set([...this.chips, e.detail])]
      this.inputElement.value = '';
      this.inputValue = ''
      this.emit();
    } else {
      this.autoCompleteValue = e.detail;
    }
  }

  render() {
    return html`
<div class="chip-list">
${this.chips.map((chip, index) => html`
<bronco-chip .deleteMode="${this.markedToDelete && index === this.chips.length - 1}"
@deleted=${async () => await this.filterChips(chip)}
@click=${() => navigateToTab('tags-view', chip)}
>
${chip}</bronco-chip>
`)}
    <input
    placeholder=${'+'}
    type="text" class="form-control ${this.chips.length ? 'not-empty' : ''}" name="tag"  id="tag"
    @keyup=${async (e: any) => await this.submitChip(e)}
    @keydown=${async (e: any) => await this.submitChip(e)}>
  </div>
  ${this.inputElement && this.inputElement.value ? html`
  <auto-complete
  .filter=${this.inputElement.value}
  @selected=${(e: CustomEvent) => this.autoCompleteEvent(e)}
  @clickSelected=${(e: CustomEvent) => this.autoCompleteEvent(e, true)}
  ></auto-complete>
  ` : ''}
`;
  }

}
