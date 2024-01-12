import axios from 'axios';

const baseURL = 'http://localhost:4000'; 

export const updateAttendance = async (label_id) => {
  const url = `${baseURL}/attendances/${label_id}`;

  try {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toISOString().split('T')[1].split('.')[0];

    const attendanceData = {
      attendance: "1",
      last_attendance_date: currentDate,
      last_attendance_time: currentTime
    };

    const response = await axios.put(url, attendanceData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200) {
      console.log(`Attendance for student with ID ${label_id} updated successfully.`);
    } else {
      console.error(`Failed to update attendance for student with ID ${label_id}.`);
    }
  } catch (error) {
    console.error('Error updating attendance:', error);
  }
};
