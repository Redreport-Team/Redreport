import { useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { NDHalls, NDHallsWithCoordinates } from "../../data/hallsData.ts";
import { FirebaseService } from "../../services/firebaseService.ts";
import { AnalyticsService } from "../../services/analyticsService.ts";
import { ReportFormData } from "../../types/index.ts";
import {
  getUserContext,
  getIncidentTypeName,
} from "../../utils/deviceUtils.ts";
import "../../animateu.css";

interface SelectHallProps {
  onHallSelect?: (hall: string) => void;
  onTypeSelect?: (type: number) => void;
  onSubmit?: (data: ReportFormData) => void;
}

function SelectHall({ onHallSelect, onTypeSelect, onSubmit }: SelectHallProps) {
  const navigate = useNavigate();

  const [Hall, SetHall] = useState<string>("");
  const [Type, SetType] = useState<number>();
  const [InstH, SetInstH] = useState<boolean>(false);
  const [Complete, SetComplete] = useState<boolean>(false);
  var CurrentHalls: Array<string> = [];
  var First = true;
  var Halls = NDHalls.map((hall) => hall.name);

  function CreateHallList(
    hall: string,
    list: HTMLElement | null,
    e: HTMLInputElement
  ) {
    const item = document.createElement("div");
    item.id = hall;
    const hallData = NDHalls.find((h) => h.name === hall);
    item.innerHTML = `${hall} (${hallData?.buildingType || "Unknown"})`;
    item.onclick = () => {
      e.value = hall;
      SetHall(hall);
      CompleteHall(hall);
      onHallSelect?.(hall);
      AnalyticsService.logHallSelection(
        hall,
        hallData?.buildingType || "Unknown"
      );
      while (list?.firstChild) {
        list.firstChild.remove();
      }
    };
    list?.appendChild(item);
  }

  function ForceDeleteHalls() {
    var list = document.getElementById("list");
    if (CurrentHalls.length == Halls.length || Complete) {
      console.log("Deleting");
      while (list?.firstChild) {
        list.firstChild.remove();
      }
      CurrentHalls = [];
    }
  }

  function ListHalls(e: HTMLInputElement) {
    var list = document.getElementById("list");
    if (First == true) {
      First = false;
      while (list?.firstChild) {
        list.firstChild.remove();
      }
    }
    for (var hall of Halls) {
      if (e.value.length == 0 && !CurrentHalls.includes(hall)) {
        CurrentHalls.push(hall);
        CreateHallList(hall, list, e);
      }
    }
  }

  function AutoCompleteHall(e: HTMLInputElement) {
    // When changed complete goes back to false
    SetComplete(false);
    e.classList.remove("completehall");
    var inputhall = e.value.replace(/[^a-zA-Z0-9]/g, "");
    var list = document.getElementById("list");
    CurrentHalls = [];
    console.log(CurrentHalls);
    while (list?.children.length != 0) {
      list?.firstChild?.remove();
    }
    for (var hall of Halls) {
      var HallBool = true; //Needs to be pushed
      var Complete = true;
      var cleanhall = hall.replace(/[^a-zA-Z0-9]/g, "");
      for (let char = 0; char < inputhall.length; char++) {
        if (
          inputhall.length > cleanhall.length ||
          inputhall[char].toLocaleLowerCase() !=
            cleanhall[char].toLocaleLowerCase()
        ) {
          HallBool = false;
          Complete = false;
        } else if (
          inputhall.length < cleanhall.length ||
          inputhall[char].toLocaleLowerCase() !=
            cleanhall[char].toLocaleLowerCase()
        ) {
          Complete = false;
        }
      }
      if (inputhall.length == 0) {
        Complete = false;
      }
      if (HallBool == true) CurrentHalls.push(hall);
      if (Complete == true) CompleteHall(hall);
    }
    for (var hall of CurrentHalls) {
      if (list?.children.namedItem(hall) == null) {
        CreateHallList(hall, list, e);
      }
    }
  }

  //Handle visuals when a dorm is selected
  function CompleteHall(hall: string) {
    var e = document.getElementById("report");
    e?.classList.add("completehall");
    SetComplete(true);
    console.log("Ran");
  }

  //Submit to Database
  const addData = async (e: string) => {
    if (!Complete) {
      alert("No Hall Selected");
      return;
    }

    if (Type === undefined) {
      alert("Please select an incident type");
      return;
    }

    try {
      // Get comprehensive hall data
      const hallData = NDHalls.find((h) => h.name === e);
      const hallWithCoordinates = NDHallsWithCoordinates.find(
        (h) => h.name === e
      );

      // Get user context information
      const userContext = getUserContext();

      // Create enhanced report data
      const enhancedReportData = {
        Dorm: e,
        Type,
        hallData: hallData
          ? {
              name: hallData.name,
              location: hallData.location,
              buildingType: hallData.buildingType,
              latitude: hallWithCoordinates?.latitude,
              longitude: hallWithCoordinates?.longitude,
            }
          : undefined,
        userAgent: userContext.deviceInfo.userAgent,
        timestamp: userContext.timestamp,
        sessionId: userContext.sessionId,
        deviceInfo: {
          platform: userContext.deviceInfo.platform,
          browser: userContext.deviceInfo.browser,
          screenResolution: userContext.deviceInfo.screenResolution,
        },
        incidentDetails: {
          typeName: getIncidentTypeName(Type),
        },
      };

      onSubmit?.(enhancedReportData);

      await FirebaseService.submitReport(enhancedReportData);
      AnalyticsService.logReportSubmission(
        e,
        Type,
        hallData,
        userContext.deviceInfo
      );
      AnalyticsService.logGeographicAnalysis(
        hallData?.location || "Unknown",
        hallWithCoordinates?.latitude,
        hallWithCoordinates?.longitude
      );

      navigate("/map", {
        state: {
          focusDorm: e,
          focusLat: hallWithCoordinates?.latitude,
          focusLng: hallWithCoordinates?.longitude,
        },
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      alert("Error submitting report. Please try again.");
    }
  };

  function Hide(e: HTMLElement) {
    var x: HTMLCollectionOf<Element> =
      e.ownerDocument.getElementsByClassName("overlay");

    for (const i of x) {
      i.classList.replace("animate__fadeIn", "animate__fadeOut");
      i.classList.replace("animate__fadeInDown", "animate__fadeOut");
    }
  }

  function Show(e: HTMLElement) {
    var x: HTMLCollectionOf<Element> =
      e.ownerDocument.getElementsByClassName("overlay");

    for (const i of x) {
      i.classList.replace("animate__fadeOut", "animate__fadeIn");
      i.classList.add("animate__fadeInDown");
    }
  }

  const handleTypeSelect = (type: number, typeName: string) => {
    SetType(type);
    onTypeSelect?.(type);
    AnalyticsService.logTypeSelection(type, typeName);
  };

  return (
    <>
      <div id="underlay" className="underlay"></div>
      <div
        id="overlay"
        className="animate__animated animate__fadeIn overlay cont"
        onMouseUp={(e) => {
          Hide(e.currentTarget);
        }}
        onTouchEnd={(e) => {
          Hide(e.currentTarget);
        }}
      >
        <div className="animate__animated animate__fadeInDown animate__delay-1s col">
          <h3 className="xxlarge">
            <b className="red">Redreport</b> ND Campus Safety Tool
            <b className="red"> Instructions</b>
          </h3>
          <p className="small">
            <i>You don't need to suffer alone</i>
          </p>
          <h6 className="small">Click anywhere to access the form</h6>
          <div className="jus-center m-2">
            <div className="chatbubble bubble small flip animate__animated animate__fadeInDown animate__delay-2s">
              Enter a HCC/ND/SMC campus location
            </div>
            <input type="text" className="w-50" />
          </div>
          <div className="just-cent">
            <div className="chatbubble bubble small animate__animated animate__fadeInDown animate__delay-2s">
              Pick the appropiate option
            </div>
            <button className="button yellowbg"></button>
            <button className="button redbg"></button>
            <button className="button bluebg"></button>
            <button className="button purplebg"></button>
            <button className="button blackbg"></button>
          </div>
        </div>
      </div>
      <div className="cont">
        <div className="just-cent">
          <div
            onClick={(e) => {
              Show(e.currentTarget);
            }}
            className="circle"
          ></div>
        </div>

        <div>
          <label htmlFor="report" id="DormQ">
            <b>Where did you feel unsafe?</b>
          </label>
          <h6>Enter a campus location</h6>
          <input
            id="report"
            type="text"
            name="report"
            placeholder="Alumni"
            onClick={(e) => {
              ListHalls(e.currentTarget);
            }}
            onInputCapture={(e) => {
              AutoCompleteHall(e.currentTarget);
            }}
          />
          <div className="just-cent h-100">
            <div id="list" className="autocomplete-items"></div>
          </div>
        </div>
        <div
          className="autocomplete"
          onMouseDown={() => {
            ForceDeleteHalls();
          }}
        ></div>
        <div className="mt-2">
          <button
            className="button yellowbg base"
            onClick={(e) => {
              e.currentTarget.focus();
              handleTypeSelect(0, "Uncomfortable Situation");
            }}
          >
            Uncomfortable Situation
          </button>
          <button
            className="button redbg base"
            onClick={(e) => {
              e.currentTarget.focus();
              handleTypeSelect(1, "Sexual Misconduct");
            }}
          >
            Sexual Misconduct
          </button>
          <button
            className="button purplebg base"
            onClick={(e) => {
              e.currentTarget.focus();
              handleTypeSelect(2, "Physical Aggression");
            }}
          >
            Physical Aggression
          </button>

          <button
            className="button bluebg base"
            onClick={(e) => {
              e.currentTarget.focus();
              handleTypeSelect(3, "Verbal Aggression");
            }}
          >
            Verbal Aggression
          </button>
          <button
            className="button blackbg base"
            onClick={(e) => {
              e.currentTarget.focus();
              handleTypeSelect(4, "Discrimination");
            }}
          >
            Discrimination
          </button>
        </div>
        <button
          className="submit button base w-50 borderred whitebg black"
          onClick={() => {
            addData(Hall);
          }}
        >
          Submit
        </button>
      </div>
    </>
  );
}

export default SelectHall;
