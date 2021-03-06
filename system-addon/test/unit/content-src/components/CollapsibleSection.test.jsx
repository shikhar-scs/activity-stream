import {actionCreators as ac, actionTypes as at} from "common/Actions.jsm";
import {_CollapsibleSection as CollapsibleSection, Disclaimer, Info} from "content-src/components/CollapsibleSection/CollapsibleSection";
import {mountWithIntl, shallowWithIntl} from "test/unit/utils";
import React from "react";

const DEFAULT_PROPS = {
  id: "cool",
  className: "cool-section",
  title: "Cool Section",
  prefName: "collapseSection",
  Prefs: {values: {collapseSection: false}},
  infoOption: {},
  disclaimer: {text: {id: "default_label_loading"}, link: {id: "menu_action_email_link"}, button: {id: "search_button"}},
  document: {
    addEventListener: () => {},
    removeEventListener: () => {},
    visibilityState: "visible"
  },
  dispatch: () => {}
};

describe("CollapsibleSection", () => {
  let wrapper;

  function setup(props = {}) {
    const customProps = Object.assign({}, DEFAULT_PROPS, props);
    wrapper = mountWithIntl(<CollapsibleSection {...customProps}>foo</CollapsibleSection>);
  }

  beforeEach(() => setup());

  it("should render the component", () => {
    assert.ok(wrapper.exists());
  });

  it("should have collapsed class if 'prefName' pref is true", () => {
    setup({Prefs: {values: {collapseSection: true}}});
    assert.ok(wrapper.instance().props.Prefs.values.collapseSection);
    assert.ok(wrapper.find(".collapsible-section").first().hasClass("collapsed"));
  });

  it("should render disclaimer if not acknowledged", () => {
    setup({Prefs: {values: {"section.cool.showDisclaimer": true}}});
    assert.lengthOf(wrapper.find(".section-disclaimer"), 1);
  });

  it("should not render disclaimer if acknowledged", () => {
    setup({Prefs: {values: {"section.cool.showDisclaimer": false}}});
    assert.lengthOf(wrapper.find(".section-disclaimer"), 0);
  });

  it("should fire a pref change event when section title is clicked", done => {
    function dispatch(a) {
      if (a.type === at.SET_PREF) {
        assert.equal(a.data.name, "collapseSection");
        assert.equal(a.data.value, true);
        done();
      }
    }
    setup({dispatch});
    wrapper.find(".click-target").simulate("click");
  });

  it("should enable animations if the tab is visible", () => {
    wrapper.instance().enableOrDisableAnimation();
    assert.ok(wrapper.instance().state.enableAnimation);
  });

  it("should disable animations if the tab is in the background", () => {
    const doc = Object.assign({}, DEFAULT_PROPS.document, {visibilityState: "hidden"});
    setup({document: doc});
    wrapper.instance().enableOrDisableAnimation();
    assert.isFalse(wrapper.instance().state.enableAnimation);
  });

  describe("without collapsible pref", () => {
    it("should render the section uncollapsed", () => {
      setup({Prefs: {values: {}}});
      assert.isFalse(wrapper.find(".collapsible-section").first().hasClass("collapsed"));
    });

    it("should not render the arrow if no collapsible pref exists for the section", () => {
      setup({Prefs: {values: {}}});
      assert.lengthOf(wrapper.find(".click-target .collapsible-arrow"), 0);
    });

    it("should not trigger a dispatch when the section title is clicked ", () => {
      const dispatch = sinon.stub();
      setup({Prefs: {values: {}}, dispatch});

      wrapper.find(".click-target").simulate("click");

      assert.notCalled(dispatch);
    });
  });

  describe("icon", () => {
    it("should use the icon prop value as the url if it starts with `moz-extension://`", () => {
      const icon = "moz-extension://some/extension/path";
      setup({icon});
      const props = wrapper.find(".icon").first().props();
      assert.equal(props.style.backgroundImage, `url('${icon}')`);
    });
    it("should use set the icon-* class if a string that doesn't start with `moz-extension://` is provided", () => {
      setup({icon: "cool"});
      assert.ok(wrapper.find(".icon").first().hasClass("icon-cool"));
    });
    it("should use the icon `webextension` if no other is provided", () => {
      setup({icon: undefined});
      assert.ok(wrapper.find(".icon").first().hasClass("icon-webextension"));
    });
  });

  describe("maxHeight", () => {
    const maxHeight = "123px";
    const setState = state => wrapper.setState(Object.assign({maxHeight}, state || {}));
    const checkHeight = val => assert.equal(wrapper.find(".section-body").instance().style.maxHeight, val);

    it("should have no max-height normally to avoid unexpected cropping", () => {
      setState();

      checkHeight("");
    });
    it("should have a max-height when animating open to a target height", () => {
      setState({isAnimating: true});

      checkHeight(maxHeight);
    });
    it("should not have a max-height when already collapsed", () => {
      setup({Prefs: {values: {collapseSection: true}}});

      checkHeight("");
    });
    it("should not have a max-height when animating closed to a css-set 0", () => {
      setup({Prefs: {values: {collapseSection: true}}});
      setState({isAnimating: true});

      checkHeight("");
    });
  });
});

describe("<Info>", () => {
  let wrapper;
  let FAKE_INFO_OPTION;

  beforeEach(() => {
    FAKE_INFO_OPTION = {
      header: {id: "fake_header"},
      body: {id: "fake_body"}
    };
    wrapper = shallowWithIntl(<Info infoOption={FAKE_INFO_OPTION} />);
  });

  it("should render info-option-icon with a tabindex", () => {
    // Because this is a shallow render, we need to use the casing
    // that react understands (tabIndex), rather than the one used by
    // the browser itself (tabindex).
    assert.lengthOf(wrapper.find(".info-option-icon[tabIndex]"), 1);
  });

  it("should render info-option-icon with a role of 'note'", () => {
    assert.lengthOf(wrapper.find('.info-option-icon[role="note"]'), 1);
  });

  it("should render info-option-icon with a title attribute", () => {
    assert.lengthOf(wrapper.find(".info-option-icon[title]"), 1);
  });

  it("should render info-option-icon with aria-haspopup", () => {
    assert.lengthOf(wrapper.find('.info-option-icon[aria-haspopup="true"]'),
      1);
  });

  it('should render info-option-icon with aria-controls="info-option"', () => {
    assert.lengthOf(
      wrapper.find('.info-option-icon[aria-controls="info-option"]'), 1);
  });

  it('should render info-option-icon aria-expanded["false"] by default', () => {
    assert.lengthOf(wrapper.find('.info-option-icon[aria-expanded="false"]'),
      1);
  });

  it("should render info-option-icon w/aria-expanded when moused over", () => {
    wrapper.find(".section-info-option").simulate("mouseover");

    assert.lengthOf(wrapper.find('.info-option-icon[aria-expanded="true"]'), 1);
  });

  it('should render info-option-icon w/aria-expanded["false"] when moused out', () => {
    wrapper.find(".section-info-option").simulate("mouseover");

    wrapper.find(".section-info-option").simulate("mouseout");

    assert.lengthOf(wrapper.find('.info-option-icon[aria-expanded="false"]'), 1);
  });
});

describe("<Disclaimer>", () => {
  let wrapper;
  const DISCLAIMER_PROPS = {
    disclaimer: {text: {id: "text"}, link: {id: "link"}, button: {id: "button"}},
    disclaimerPref: "section.test.showDisclaimer",
    eventSource: "test"
  };

  function setup(props = {}) {
    const customProps = Object.assign({}, DISCLAIMER_PROPS, props);
    wrapper = shallowWithIntl(<Disclaimer {...customProps}>foo</Disclaimer>);
  }

  beforeEach(() => setup());

  it("should render disclaimer", () => {
    assert.lengthOf(wrapper.find(".section-disclaimer"), 1);
  });

  it("should send telemetry and set pref to acknowledge disclaimer when button is clicked", () => {
    const dispatch = sinon.spy();
    setup({dispatch});

    wrapper.find(".section-disclaimer").childAt(1).simulate("click");
    assert.calledTwice(dispatch);
    assert.calledWith(dispatch.firstCall, ac.SetPref("section.test.showDisclaimer", false));
    assert.calledWith(dispatch.secondCall, ac.UserEvent({event: "SECTION_DISCLAIMER_ACKNOWLEDGED", source: "test"}));
  });
});
